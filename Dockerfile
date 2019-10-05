FROM node:latest

RUN apt-get update --yes && \
  apt-get upgrade --yes

# Install Elasticsearch
RUN apt-get install --yes openjdk-8-jre
RUN curl https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-1.7.1.deb > /tmp/elasticsearch.deb
RUN dpkg --install /tmp/elasticsearch.deb
RUN update-rc.d elasticsearch defaults 95 10
RUN /usr/share/elasticsearch/bin/plugin -install elasticsearch/elasticsearch-analysis-icu/2.5.0

# install nginx
RUN apt-get install --yes nginx-light
COPY docker/nodejs.conf docker/search_node.conf /etc/nginx/sites-enabled/
RUN rm /etc/nginx/sites-enabled/default

# Install supervisor
RUN apt-get install --yes supervisor
COPY docker/supervisor.conf /supervisor/supervisor.conf

WORKDIR /app
COPY . /app
COPY ./example.apikeys.json /app/apikeys.json
COPY ./example.config.json /app/config.json
COPY ./example.mappings.json /app/mappings.json
RUN /app/install.sh
EXPOSE 80

CMD service elasticsearch start && \
	service nginx start && \
	supervisord -c /supervisor/supervisor.conf
