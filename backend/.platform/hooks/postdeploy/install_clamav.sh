#!/usr/bin/env bash

# install software
amazon-linux-extras install -y epel
yum -y install clamav clamav-update awslogs

# set up clamscan
systemctl stop clamav-freshclam
freshclam
systemctl start clamav-freshclam

# set up awslogs
sed -i "s/us-east-1/us-east-2/" /etc/awslogs/awscli.conf

ENV_NAME=`/opt/elasticbeanstalk/bin/get-config container -k environment_name`
cat <<EOT > /etc/awslogs/awslogs.conf
[general]
state_file = /var/lib/awslogs/agent-state
[/var/log/clamscan]
datetime_format = %b %d %H:%M:%S
file = /var/log/clamscan/*
buffer_duration = 5000
log_stream_name = {instance_id}
initial_position = start_of_file
log_group_name = /aws/elasticbeanstalk/$ENV_NAME/clamav
EOT

service awslogsd start
systemctl enable awslogsd

