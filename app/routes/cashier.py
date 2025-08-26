from flask import Blueprint, render_template, session, redirect, url_for
from ..models import Cashier

cashier_bp = Blueprint("cashier", __name__)


@cashier_bp.get("/cashier")
def cashier_page():
    cashier_name = None
    counter_number = None
    cashier_id = session.get("cashier_id")
    if cashier_id:
        c = Cashier.query.get(cashier_id)
        if c:
            cashier_name = c.name
            counter_number = c.counter_number
    else:
        return redirect(url_for("auth.login_cashier_form"))

    return render_template("cashier.html", cashier_name=cashier_name, counter_number=counter_number)
