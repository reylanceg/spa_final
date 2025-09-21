# SPA Management System (Flask + Socket.IO + MySQL)

Real-time multi-role SPA management system (Customer, Therapist, Cashier, Monitor) with FIFO queues, concurrency-safe claiming, live updates, and payments.

## Tech Stack

- Python Flask
- Flask-SocketIO (eventlet)
- SQLAlchemy ORM (via Flask-SQLAlchemy) with MySQL (PyMySQL driver)
- HTML, CSS, Vanilla JS

## Setup

1. Install Python 3.10+.
2. Install MySQL (XAMPP) and create database `test_db`.
3. Create virtual environment using command `python -m venv env`.
4. Activate the virtual environment `env/Scripts/activate`.
5. Install dependencies, go inside the spa_management folder, execute the command:
   ```bash
   pip install -r requirements.txt
   ```
   
6. Initialize DB and seed sample data:
   - Start the server once:
     ```bash
     python run.py 
     ```

7. Go to the scripts folder , then run the seed.py to seed tables with data:
   - `python seed.py`

- Customer Service selection pages:
   - `http://localhost:5000/services1`
   - `http://localhost:5000/services2`

- Therapist: `http://localhost:5000/login/therapist`
- Cashier: `http://localhost:5000/login/cashier`
- Monitor: `http://localhost:5000/monitor`

Therapist and Cashier sample credentials are inside the seed.py file, example data:
- therapist1 = password123
- cashier1 = password123
