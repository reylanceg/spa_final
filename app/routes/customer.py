from flask import Blueprint, render_template, jsonify
from ..extensions import db
from ..models import Service, Therapist, Cashier, Category

customer_bp = Blueprint("customer", __name__)


# @customer_bp.get("/")
# @customer_bp.get("/customer/")
# def customer_page():
#     services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
#     categories: dict[str, list[Service]] = {}
#     for s in services:
#         cat_name = s.category.name if s.category else "Uncategorized"
#         categories.setdefault(cat_name, []).append(s)
#     return render_template("customer2.html", services=services, categories=categories)

@customer_bp.get("/")
def home_page():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("index.html", services=services, categories=categories)

# Experimental link for service 2 page
@customer_bp.get("/services1")
def customer_page1():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("services1.html", services=services, categories=categories)

@customer_bp.get("/services2")
def customer_page2():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("services2.html", services=services, categories=categories)


# API ginagamit ni therapist page para kuhain yung data sa services table ng database
@customer_bp.get("/api/services")
def api_services():
    services = Service.query.filter_by(active=True).order_by(Service.name.asc()).all()
    return jsonify([
        {
            "id": s.id, 
            "name": s.name, 
            "price": s.price, 
            "duration_minutes": s.duration_minutes, 
            "category": s.category.name if s.category else "Uncategorized",
            "category_description": s.category.description if s.category else "No description available",
            "classification": s.classification or "Not specified"
        }
        for s in services
    ])

# Panlagay ng dummy datas sa tables ng database: services, therapist, cashier tables
@customer_bp.get("/initdb/")
def initdb():
    db.drop_all()
    db.create_all()

    # Seed categories first
    categories_data = [
        ("Signature Massage","Our most popular massage experiences."),
        # ("Signature Massage", "THE SHIATSU", "Premium massage services."),
        ("Supplementary", "Enhance your session with add-ons."),
        ("Holistic Recovery", "Therapies designed for recovery and balance."),
    ]
    
    categories = {}
    for name, description in categories_data:
        cat = Category(name=name ,description=description)
        db.session.add(cat)
        db.session.flush()  # Get the ID
        categories[name] = cat.id

    # Seed services with category IDs and classifications
    defaults = [
        ("Accupressure", 40.0, 60, "Signature Massage", "Full Back"),
        ("Accupressure", 65.0, 90, "Signature Massage", "Full Body"),
        ("Foot Reflexology (30m)", 20.0, 30, "Supplementary", "Feet"),
        ("Hot Stone Massage (60m)", 55.0, 60, "Holistic Recovery", "Full Body"),
        ("Facial (45m)", 35.0, 45, "Holistic Recovery", "Face & Head"),
    ]
    for name, price, mins, cat_name, classification in defaults:
        category_id = categories.get(cat_name)
        s = Service(name=name, price=price, duration_minutes=mins, category_id=category_id, classification=classification)
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
