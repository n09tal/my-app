#!/bin/bash

# QA2 RDS Database Connection Setup Script
# Connection details for duett-qa2-db

export RDS_DB_NAME=ebdb
export RDS_USERNAME=duettadin
export RDS_PASSWORD=duettqa2db
export RDS_HOSTNAME=duett-qa2-db.cvacvubhvnip.us-east-2.rds.amazonaws.com
export RDS_PORT=5432

# Django Settings
export SECRET_KEY=your-secret-key-here
export DJANGO_SETTINGS_MODULE=config.settings.qa2

# Optional: Other environment variables you might need
# export AWS_ACCESS_KEY_ID=your-key
# export AWS_SECRET_ACCESS_KEY=your-secret
# export AWS_REGION=us-east-2

echo "✅ Environment variables set for QA2 RDS connection"
echo "   RDS_HOSTNAME: $RDS_HOSTNAME"
echo "   RDS_DB_NAME: $RDS_DB_NAME"
echo "   RDS_USERNAME: $RDS_USERNAME"
echo ""
echo "📝 To use these variables, run: source setup_qa2_db.sh"
echo "🔍 Then test connection: python manage.py dbshell"
echo "🚀 Or run migrations: python manage.py migrate"

