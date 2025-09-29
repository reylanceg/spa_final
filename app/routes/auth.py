from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify
from ..extensions import db
from ..models import Therapist, Cashier
from ..utils.auth_helpers import create_token_for_user, invalidate_token, get_current_therapist, get_current_cashier

auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/login/therapist")
def login_therapist_form():
    return render_template("login_therapist.html")


@auth_bp.post("/login/therapist")
def login_therapist():
    username = request.form.get("username", "").strip()
    password = request.form.get("password", "").strip()
    room_number = request.form.get("room_number", "").strip()

    therapist_data = Therapist.query.filter_by(username=username).first()
    if not therapist_data or not therapist_data.check_password(password):
        return render_template("login_therapist.html", error="Invalid credentials")

    if room_number:
        therapist_data.room_number = room_number
        db.session.commit()

    # Generate auth token
    token = create_token_for_user(therapist_data)
    
    # Still set session for backward compatibility
    session["therapist_id"] = therapist_data.id
    
    # Return a page that will store the token and redirect
    # return render_template("login_success_therapist.html", 
    #                      token=token, 
    #                      redirect_url=url_for("therapist.therapist_page"))
    return render_template("therapist.html", token=token)


@auth_bp.get("/logout/therapist")
def logout_therapist():
    # Get current therapist and invalidate their token
    therapist, auth_method = get_current_therapist()
    if therapist and auth_method == 'token':
        invalidate_token(therapist)
    
    # Clear session for backward compatibility
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

    cashier = Cashier.query.filter_by(username=username).first()
    if not cashier or not cashier.check_password(password):
        return render_template("login_cashier.html", error="Invalid credentials")

    if counter_number:
        c.counter_number = counter_number
        db.session.commit()

    # Generate auth token
    token = create_token_for_user(cashier)
    
    # Still set session for backward compatibility
    session["cashier_id"] = cashier.id
    
    # Return a page that will store the token and redirect
    # return render_template("login_success_cashier.html", 
    #                      token=token, 
    #                      redirect_url=url_for("cashier.cashier_page"))
    return render_template('cashier.html', token=token)


@auth_bp.get("/logout/cashier")
def logout_cashier():
    # Get current cashier and invalidate their token
    cashier, auth_method = get_current_cashier()
    if cashier and auth_method == 'token':
        invalidate_token(cashier)
    
    # Clear session for backward compatibility
    session.pop("cashier_id", None)
    return redirect(url_for("auth.login_cashier_form"))

