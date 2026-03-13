FROM python:3.7
# The enviroment variable ensures that the python output is set straight
# to the terminal with out buffering it first
ENV PYTHONUNBUFFERED 1
# create root directory for our project in the container
RUN mkdir /duett-django
# Set the working directory to /music_service
WORKDIR /duett-django
# Copy the current directory contents into the container at /music_service
ADD . /duett-django/
# Install any needed packages specified in requirements.txt
COPY . .
RUN pip install -r requirements.txt

EXPOSE 8000
CMD exec gunicorn config.wsgi:application — bind 0.0.0.0:8000  — workers 3
#EXPOSE 8000 9191
# RUN chmod 777 /duett-django/entrypoint.sh
# ENTRYPOINT ["/duett-django/entrypoint.sh"]
# CMD ["run"]