from flask import Blueprint, render_template, request, redirect, url_for, session
from ..extensions import db
from ..models import Therapist, Cashier

auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/login/therapist")
def login_therapist_form():
    return render_template("login_therapist.html")


@auth_bp.post("/login/therapist")
def login_therapist():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()
    room_number = request.form.get("room_number", "").strip()

    t = Therapist.query.filter_by(username=username).first()
    if not t or not t.check_password(password):
        return render_template("login_therapist.html", error="Invalid credentials")

    if room_number:
        t.room_number = room_number
        db.session.commit()

    session["therapist_id"] = t.id
    return redirect(url_for("therapist.therapist_page"))


@auth_bp.get("/logout/therapist")
def logout_therapist():
    session.pop("therapist_id", None)
    return redirect(url_for("auth.login_therapist_form"))


@auth_bp.get("/login/cashier")
def login_cashier_form():
    return render_template("login_cashier.html")


@auth_bp.post("/login/cashier")
def login_cashier():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()
    counter_number = request.form.get("counter_number", "").strip()

    c = Cashier.query.filter_by(username=username).first()
    if not c or not c.check_password(password):
        return render_template("login_cashier.html", error="Invalid credentials")

    if counter_number:
        c.counter_number = counter_number
        db.session.commit()

    session["cashier_id"] = c.id
    return redirect(url_for("cashier.cashier_page"))


@auth_bp.get("/logout/cashier")
def logout_cashier():
    session.pop("cashier_id", None)
    return redirect(url_for("auth.login_cashier_form"))

