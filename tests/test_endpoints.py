from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_valid_csv():
    csv_content = "order_id,name\n1,Apple\n2,Banana\n"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["rows"] == 2
    assert data["columns"] == 2

def test_upload_invalid_csv():
    # Missing 'order_id' column
    csv_content = "id,product\n1,Apple\n2,Banana\n"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    assert "Missing one or more required columns" in response.json()["detail"]

def test_upload_non_csv_file():
    txt_content = "some,text,data"
    files = {"file": ("test.txt", txt_content, "text/plain")}
    response = client.post("/upload", files=files)
    assert response.status_code == 400
    # Change the string to match the exact error message
    assert "Invalid file type. Only CSV files are allowed." in response.json()["detail"]

def test_process_without_upload():
    response = client.post("/process")
    assert response.status_code == 400
    assert "No basket data uploaded" in response.json()["detail"]

def test_process_with_upload():
    csv_content = "order_id,name\n1,Apple\n2,Banana\n"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    upload_response = client.post("/upload", files=files)
    assert upload_response.status_code == 200

    process_response = client.post("/process")
    assert process_response.status_code == 200
    data = process_response.json()
    assert data["processed_baskets"] > 0