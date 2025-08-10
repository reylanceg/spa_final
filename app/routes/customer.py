from flask import Blueprint, render_template, jsonify
from ..extensions import db
from ..models import Service, Therapist, Cashier

customer_bp = Blueprint("customer", __name__)


@customer_bp.get("/")
@customer_bp.get("/customer/")
def customer_page():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    return render_template("customer.html", services=services)


@customer_bp.get("/api/services")
def api_services():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    return jsonify([
        {"id": s.id, "name": s.name, "price": s.price, "duration_minutes": s.duration_minutes}
        for s in services
    ])


@customer_bp.get("/initdb/")
def initdb():
    db.drop_all()
    db.create_all()

    # Seed services
    defaults = [
        ("Swedish Massage (60m)", 40.0, 60),
        ("Deep Tissue Massage (90m)", 65.0, 90),
        ("Foot Reflexology (30m)", 20.0, 30),
        ("Hot Stone Massage (60m)", 55.0, 60),
        ("Facial (45m)", 35.0, 45),
    ]
    for name, price, mins in defaults:
        s = Service(name=name, price=price, duration_minutes=mins)
        db.session.add(s)

    # Seed therapists with credentials
    t1 = Therapist(username="thera1", name="Therapist 1", room_number="101")
    t1.set_password("pass123")
    t2 = Therapist(username="thera2", name="Therapist 2", room_number="102")
    t2.set_password("pass123")
    db.session.add_all([t1, t2])

    # Seed cashiers with credentials
    c1 = Cashier(username="cash1", name="Cashier 1", counter_number="1")
    c1.set_password("pass123")
    c2 = Cashier(username="cash2", name="Cashier 2", counter_number="2")
    c2.set_password("pass123")
    db.session.add_all([c1, c2])

    db.session.commit()
    return "Database initialized and seeded. Visit /login/therapist and /login/cashier", 200
