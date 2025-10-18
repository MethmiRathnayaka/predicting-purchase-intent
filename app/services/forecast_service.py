import pandas as pd
import numpy as np
from typing import Dict, Any
from numpy.typing import ArrayLike

from sklearn.metrics import mean_squared_error

try:
    from statsmodels.tsa.arima.model import ARIMA
except Exception:  # pragma: no cover - imported if available
    ARIMA = None

try:
    from prophet import Prophet
except Exception:  # pragma: no cover - imported if available
    Prophet = None


def mase(actual: ArrayLike, forecast: ArrayLike) -> float:
    """Mean Absolute Scaled Error relative to naive one-step forecast.

    actual and forecast are 1-d numpy arrays of same length.
    """
    actual = np.asarray(actual, dtype=float)
    forecast = np.asarray(forecast, dtype=float)
    if actual.shape != forecast.shape:
        raise ValueError('actual and forecast must have same shape')
    if len(actual) < 2:
        return float('nan')

    naive = actual[:-1]
    mae_naive = np.mean(np.abs(actual[1:] - naive))
    mae_model = np.mean(np.abs(actual - forecast))
    return float(mae_model / mae_naive) if mae_naive != 0 else float('inf')


def smape(y_true: ArrayLike, y_pred: ArrayLike) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    denom = (np.abs(y_true) + np.abs(y_pred))
    denom[denom == 0] = 1e-8
    return float(100.0 / len(y_true) * np.sum(2.0 * np.abs(y_pred - y_true) / denom))


def run_forecast(df: pd.DataFrame, test_size: float = 0.2) -> Dict[str, Any]:
    """Compare Naive, ARIMA and Prophet forecasts on the provided DataFrame.

    Expects columns 'Date' and 'Total Price'. Splits data into train/test by `test_size` fraction.
    Returns forecasts and metrics (RMSE, MASE, sMAPE) for each model. If ARIMA or Prophet
    are not available in the environment, they will be skipped and indicated in the result.
    """
    if not isinstance(df, pd.DataFrame):
        raise ValueError('df must be a pandas DataFrame')
    if 'Date' not in df.columns or 'Total Price' not in df.columns:
        raise ValueError("DataFrame must contain 'Date' and 'Total Price' columns")

    df = df.copy()
    df['Date'] = pd.to_datetime(df['Date'])
    series = df.groupby('Date')['Total Price'].sum().sort_index()

    n = len(series)
    if n < 3:
        raise ValueError('Not enough observations to run forecasting (need at least 3)')

    test_len = max(1, int(np.ceil(n * test_size)))
    train = series.iloc[:-test_len]
    test = series.iloc[-test_len:]

    results: Dict[str, Any] = {}

    # 1) Naive forecast
    naive_forecast = np.repeat(float(train.iloc[-1]), len(test)).astype(float)
    test_arr = np.asarray(test.values, dtype=float)
    results['Naive'] = {
        'forecast': naive_forecast.tolist(),
        'RMSE': float(np.sqrt(mean_squared_error(test_arr, naive_forecast))),
        'MASE': mase(test_arr, naive_forecast),
        'sMAPE': smape(test_arr, naive_forecast),
    }

    # 2) ARIMA
    if ARIMA is None:
        results['ARIMA'] = {'error': 'statsmodels ARIMA not available in environment'}
    else:
        try:
            model = ARIMA(train, order=(1, 1, 1))
            fitted = model.fit()
            pred = fitted.forecast(steps=len(test))
            pred_vals = np.asarray(pred, dtype=float)
            results['ARIMA'] = {
                'forecast': pred_vals.tolist(),
                'RMSE': float(np.sqrt(mean_squared_error(test_arr, pred_vals))),
                'MASE': mase(test_arr, pred_vals),
                'sMAPE': smape(test_arr, pred_vals),
            }
        except Exception as e:
            results['ARIMA'] = {'error': f'ARIMA failed: {str(e)}'}

    # 3) Prophet
    if Prophet is None:
        results['Prophet'] = {'error': 'prophet package not available in environment'}
    else:
        try:
            df_prophet = train.reset_index().rename(columns={'Date': 'ds', 'Total Price': 'y'})
            m = Prophet()
            m.fit(df_prophet)
            future = m.make_future_dataframe(periods=len(test), freq=None)
            forecast = m.predict(future)
            y_pred = np.asarray(forecast['yhat'].iloc[-len(test):].values, dtype=float)
            results['Prophet'] = {
                'forecast': y_pred.tolist(),
                'RMSE': float(np.sqrt(mean_squared_error(test_arr, y_pred))),
                'MASE': mase(test_arr, y_pred),
                'sMAPE': smape(test_arr, y_pred),
            }
        except Exception as e:
            results['Prophet'] = {'error': f'Prophet failed: {str(e)}'}

    # Include train/test summaries
    results['_meta'] = {
        'train_start': str(train.index[0]) if len(train) else None,
        'train_end': str(train.index[-1]) if len(train) else None,
        'test_start': str(test.index[0]) if len(test) else None,
        'test_end': str(test.index[-1]) if len(test) else None,
        'test_length': int(len(test)),
    }

    return results
