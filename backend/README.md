# Duett Django

**Table of Contents**

1. [Technologies](#technologies)
1. [Running Locally](#running-locally)
1. [Poetry Package Management](#poetry-instructions)
1. [Development Instructions](#development-instructions)
1. [Authentication](#authentication-overview)

## Technologies

- Django 3.1
- Django REST Framework
- [Swagger](https://github.com/axnsan12/drf-yasg) (API documentation)
- Postgres
- Flake8
- [Black](https://github.com/psf/black/) (auto-formatting)
- [Pre-commit](https://pre-commit.com/) (forced formatting on commit)
- Auth
    - DJ REST Auth
    - Allauth
    - Simple JWT Token

## Running Locally

### Requirements

- Postgres: [Postgres Mac App](http://postgresapp.com/) or [Postgres CLI](https://formulae.brew.sh/formula/postgresql#default)
- Python version 3.7.1 (use [Pyenv](https://github.com/pyenv/pyenvin) to manage your Python versions)
- [Poetry](https://python-poetry.org/) (Python package manager)
- [Pre-commit](https://pre-commit.com/#install)

### First Time Setup

1. Clone repo and cd into directory
1. Create virtual environment: `python -m venv venv` (you could also use Poetry for this step, but I think it's easier this way)
1. Run: `source venv/bin/activate`
1. Install packages: `poetry install`
1. Set up the pre-commit hook (to automatically auto-format): `pre-commit install`
1. Database setup from terminal (`psql postgres -U [username]`):
    1. Create the database: `CREATE DATABASE duett;`
    1. Create DB user: `CREATE USER duett_admin;`
    1. Grant privilages to user for our database: `GRANT ALL PRIVILEGES ON DATABASE duett TO duett_admin;`
1. Run migrations: `python manage.py migrate --settings=config.settings.local`
1. Create an admin user for logging into the Django admin interface: `python manage.py createsuperuser --settings=config.settings.local`

### Running the App

1. Make sure you are already in your virtual environment: `source venv/bin/activate`
1. Run the app: `python manage.py runserver --settings=config.settings.local`
1. View the API at http://localhost:8000 and the admin interface at http://localhost:8000/admin

## Poetry Instructions

**Add New Dependencies:**

- `poetry add [package-name]`
- Dev dependency: `poetry add -D [package-name]`

## Development Instructions

**Add New App**

1. `mkdir duett_api/[app_name]`
1. `python manage.py startapp [app_name] duett_api/[app_name]`
1. Add app to `LOCAL_APPS` list in `config/settings/base.py`

**Using the Black Auto-formatter**

You can run the auto-formatter at any time using the pre-commit hook manually: `pre-commit run --all-files`

See more Black options [here](https://github.com/psf/black).

**Skip Pre-commit Hooks**

`SKIP=flake8,black git commit -m "message"`

## Authentication Overview

We are using three packages for authentication in this app (in addition to the built-in Django sessions that are used for the admin interface):

1. [`dj-rest-auth`](https://github.com/jazzband/dj-rest-auth): This is used for auth endpoints. The library works well with the simple token auth library that we are using too.
    - `/login`
    - `/logout`
    - `/registration`
    - `/registration/verify-email`
    - `/token/verify`
    - `/token/refresh`
    - `/password/reset`
    - `/password/reset/confirm`

2. [`django-allauth`](https://github.com/pennersr/django-allauth): Using this for user registration. May use other features in the future.

3. [`djangorestframework-simplejwt`](https://github.com/SimpleJWT/django-rest-framework-simplejwt): Using this library for JWT tokens. It has many more features than the built in one provided by DRF, including setting tokens to expire and blacklisting options.

## API Docs

### Swagger Instructions

Swagger exposes 4 endpoints:

- A JSON view of your API specification at /swagger.json
- A YAML view of your API specification at /swagger.yaml
- A swagger-ui view of your API specification at /swagger/
- A ReDoc view of your API specification at /redoc/

### Filter, Searching, and Sorting

Filtering, searching, and sorting can all be done through the following query parameters:

1. `limit`: number of results returned with a single call
1. `offset`: number of results to skip; used for pagination
1. `search`: search term
1. `ordering`: single field or comman-separated fields to use for ordering results. Can prepend with a `-` for DESC instead of ASC results.

You can also use custom parameters to filter based off of strict equality. For example, to check that a boolean field is true, you can use: `?equipment=True`.

### Endpoints

`/api/requests/`

- Returns list of all patient requests that the user has access to.
- Add this query param to show hidden requests for providers: `?show-hidden=true`

`/api/table-columns/`

- Returns a list of table columns based off of the following conditions:
    - Must have query parameter denoting which table to pull columns for: `table=1` (right now, there is only one table; patient requests)
    - Some columns are different based off of account type: provider or agency
    - Default columns are ones that every user will see on their table. Custom columns are ones that they have created themselves (this feature is coming soon.)

hi