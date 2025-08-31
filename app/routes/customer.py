from flask import Blueprint, render_template, jsonify
from ..extensions import db
from ..models import Service, ServiceCategory, ServiceClassification, Therapist, Cashier

customer_bp = Blueprint("customer", __name__)

@customer_bp.get("/")
def home_page():
    services = Service.query.order_by(Service.service_name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.category_name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("home.html", services=services, categories=categories)

@customer_bp.get("/about")
def about_age():
    return render_template("about.html")

# Experimental link for service 2 page
@customer_bp.get("/services1")
def customer_page1():
    services = Service.query.order_by(Service.service_name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.category_name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("services1.html", services=services, categories=categories)

@customer_bp.get("/services2")
def customer_page2():
    services = Service.query.order_by(Service.service_name.asc()).all()
    categories: dict[str, list[Service]] = {}
    for s in services:
        cat_name = s.category.category_name if s.category else "Uncategorized"
        categories.setdefault(cat_name, []).append(s)
    return render_template("services2.html", services=services, categories=categories)


# API ginagamit ni therapist page para kuhain yung data sa services table ng database
@customer_bp.get("/api/services")
def api_services():
    services = Service.query.order_by(Service.service_name.asc()).all()
    result = []
    for s in services:
        for classification in s.classifications:
            result.append({
                "id": s.id,
                "classification_id": classification.id,
                "name": s.service_name,
                "classification_name": classification.classification_name,
                "price": classification.price,
                "duration_minutes": classification.duration_minutes,
                "category": s.category.category_name if s.category else "Uncategorized",
                "description": s.description or "No description available"
            })
    return jsonify(result)

# API to get service classifications for a specific service
@customer_bp.get("/api/services/<int:service_id>/classifications")
def api_service_classifications(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify([
        {
            "id": classification.id,
            "classification_name": classification.classification_name,
            "price": classification.price,
            "duration_minutes": classification.duration_minutes,
            "service_name": service.service_name,
            "category": service.category.category_name if service.category else "Uncategorized"
        }
        for classification in service.classifications
    ])

# API to get all service categories
@customer_bp.get("/api/categories")
def api_categories():
    categories = ServiceCategory.query.order_by(ServiceCategory.category_name.asc()).all()
    return jsonify([
        {
            "id": category.id,
            "category_name": category.category_name,
            "services_count": len(category.services)
        }
        for category in categories
    ])


