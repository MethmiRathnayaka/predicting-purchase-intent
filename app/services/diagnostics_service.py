import pandas as pd
from statsmodels.tsa.stattools import adfuller
from statsmodels.tsa.seasonal import STL
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import io
import base64
import matplotlib.pyplot as plt
from typing import Dict, Any, Optional


def _plot_to_base64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def run_diagnostics(df: pd.DataFrame, period: Optional[int] = 7, max_lags: int = 30) -> Dict[str, Any]:
    """Run time-series diagnostics on a DataFrame with 'Date' and 'Total Price' columns.

    Steps performed:
    - aggregate by Date and ensure datetime index
    - Augmented Dickey-Fuller test for stationarity
    - STL decomposition to estimate trend and seasonality strengths
    - Autocorrelation (ACF) and Partial ACF (PACF) plots encoded as base64 PNGs

    Returns a dict with stationarity results, strength metrics, short decomposition sample,
    and base64-encoded ACF/PACF images.

    Parameters
    ----------
    df : pd.DataFrame
        Input data. Must contain 'Date' and 'Total Price'.
    period : int, optional
        Seasonal period to pass to STL. Default is 7.
    max_lags : int, optional
        Number of lags to show in ACF/PACF plots. Default is 30.
    """
    if not isinstance(df, pd.DataFrame):
        raise ValueError("df must be a pandas DataFrame")

    if 'Date' not in df.columns or 'Total Price' not in df.columns:
        raise ValueError("DataFrame must contain 'Date' and 'Total Price' columns")

    # Aggregate and prepare series
    series = df.groupby('Date')['Total Price'].sum().reset_index()
    series['Date'] = pd.to_datetime(series['Date'])
    series = series.sort_values('Date')
    series = series.set_index('Date')

    # Ensure there's enough data
    if len(series) < 3:
        raise ValueError('Not enough data points for diagnostics (need at least 3)')

    ts = series['Total Price']

    # ADF test
    adf_result = adfuller(ts.dropna())
    stationarity = {
        'adf_statistic': float(adf_result[0]),
        'p_value': float(adf_result[1]),
        'used_lag': int(adf_result[2]),
        'nobs': int(adf_result[3]),
        'critical_values': {k: float(v) for k, v in adf_result[4].items()},
        'icbest': float(adf_result[5]) if len(adf_result) > 5 else None,
    }

    # STL decomposition
    # If period is larger than length, fallback to 1 (no seasonality)
    stl_period = period if period and period >= 2 and period < len(ts) else 1
    stl = STL(ts, period=stl_period, robust=True)
    res = stl.fit()

    trend_strength = float(res.trend.var() / ts.var()) if ts.var() != 0 else 0.0
    seasonality_strength = float(res.seasonal.var() / ts.var()) if ts.var() != 0 else 0.0

    decomposition_sample = {
        'trend_head': res.trend.dropna().head(5).to_dict(),
        'seasonal_head': res.seasonal.dropna().head(5).to_dict(),
        'resid_head': res.resid.dropna().head(5).to_dict(),
    }

    # ACF plot
    fig_acf, ax_acf = plt.subplots(figsize=(8, 4))
    plot_acf(ts.fillna(method='ffill').values, ax=ax_acf, lags=min(max_lags, len(ts) - 1))
    acf_b64 = _plot_to_base64(fig_acf)

    # PACF plot
    fig_pacf, ax_pacf = plt.subplots(figsize=(8, 4))
    try:
        plot_pacf(ts.fillna(method='ffill').values, ax=ax_pacf, lags=min(max_lags, len(ts) - 1))
        pacf_b64 = _plot_to_base64(fig_pacf)
    except Exception:
        plt.close(fig_pacf)
        pacf_b64 = ''

    diagnostics = {
        'stationarity': stationarity,
        'trend_strength': trend_strength,
        'seasonality_strength': seasonality_strength,
        'decomposition_sample': decomposition_sample,
        'acf_plot_b64': acf_b64,
        'pacf_plot_b64': pacf_b64,
        'stl_period_used': stl_period,
    }

    return diagnostics
