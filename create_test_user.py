#!/usr/bin/env python
"""Create test therapist and cashier accounts for testing"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Therapist, Cashier

def create_test_users():
    """Create test therapist and cashier accounts"""
    app = create_app()
    
    with app.app_context():
        # Check if test therapist already exists
        therapist = Therapist.query.filter_by(username='therapist1').first()
        if not therapist:
            therapist = Therapist(
                username='therapist1',
                name='Test Therapist 1',
                room_number='101',
                active=True
            )
            therapist.set_password('password')
            db.session.add(therapist)
            print("✓ Created therapist1")
        else:
            print("✓ therapist1 already exists")
        
        # Create second therapist for testing
        therapist2 = Therapist.query.filter_by(username='therapist2').first()
        if not therapist2:
            therapist2 = Therapist(
                username='therapist2',
                name='Test Therapist 2',
                room_number='102',
                active=True
            )
            therapist2.set_password('password')
            db.session.add(therapist2)
            print("✓ Created therapist2")
        else:
            print("✓ therapist2 already exists")
        
        # Check if test cashier already exists
        cashier = Cashier.query.filter_by(username='cashier1').first()
        if not cashier:
            cashier = Cashier(
                username='cashier1',
                name='Test Cashier 1',
                counter_number='1',
                active=True
            )
            cashier.set_password('password')
            db.session.add(cashier)
            print("✓ Created cashier1")
        else:
            print("✓ cashier1 already exists")
        
        # Create second cashier for testing
        cashier2 = Cashier.query.filter_by(username='cashier2').first()
        if not cashier2:
            cashier2 = Cashier(
                username='cashier2',
                name='Test Cashier 2',
                counter_number='2',
                active=True
            )
            cashier2.set_password('password')
            db.session.add(cashier2)
            print("✓ Created cashier2")
        else:
            print("✓ cashier2 already exists")
        
        db.session.commit()
        print("\n✓ Test users created successfully!")
        print("\nTest Credentials:")
        print("  Therapist 1: username=therapist1, password=password")
        print("  Therapist 2: username=therapist2, password=password")
        print("  Cashier 1: username=cashier1, password=password")
        print("  Cashier 2: username=cashier2, password=password")

if __name__ == '__main__':
    create_test_users()
