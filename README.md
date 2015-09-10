
# Requirements
The guide assumes that you have an installed linux based server with the following packages installed and at least the versions given.

 * nginx 1.4.x
 * redis 2.8.x
 * node 0.10.x
 * elastic search 1.5.x
 * supervisor 3.x
 * Valid SSL certificates for you domain.

The document also assumes that you are logged in as the user _deploy_, if this is not the case, you need to change this (e.g. the supervisor run script).

# Conventions
This document uses __[]__ square brackets around the different variables in the configuration templates that needs to be exchanged with the actual values from other parts of the configuration (e.g. API keys).

Her is an explanation of the different key configuration variables.

  * [server name]
  * [client name]
  * [SSL CERT]
  * [SSL KEY]
  * [CHANGE ME]
  * [PASSWORD]
  * [SEARCH API KEY]
  * [SEARCH INDEX KEY]
  * @TODO Document placeholders [...]

<pre>
Things in boxes are commands that should be executed or configuration thats need in the files given.
</pre>

# Installation

If you already have a running middleware and search node on the server you can skip the steps and just add the needed api-keys in both and add mappings in the search node.
You can use the UI or edit the JSON files directly.

__Note:__ To install the newest version (development version that's not aways stable), you should checkout the development branches in the all the cloned repositories instead of the latest version tag.

## Search node
The search node application is a general purpose application to provide a fast search engine through web-socket connections (using elasticsearch) and is designed to be used by other projects as well as aroskanalen. As a result of this, it will not follow the same versioning as the other parts of this installation. It's also why its UI is somewhat complex to use when setting up the right mappings to be used with aroskanalen.

### Clone
Start by cloning the git repository for the search node and checkout the latest release tag (which can be found using _git tag_).

<pre>
cd /home/www
git clone git@github.com:aroskanalen/search_node.git
cd search_node
git checkout [v1.x.x]
</pre>

### Node packages
Search node, as the middleware, uses a plugin architecture that requires installation of libraries from the node package manager (npm). The application comes with an installation script to handle this, simply go to the root of the application and execute the script.

<pre>
cd /home/www/search_node/
./install.sh
</pre>

### Configuration

We need to configure nginx to sit in front of the search node so it is accessible through normal web-ports and also proxy web-socket connections. So we add the upstream connection configuration in the nodejs configuration file used by the middleware.

<pre>
sudo nano -w /etc/nginx/sites-available/nodejs
</pre>

Append this upstream connection definition to the file.

<pre>
upstream nodejs_search {
  server 127.0.0.1:3010;
}
</pre>

To access the search node UI and allow communication with the search node a virtual host configuration is needed. You need to change the _[server name]_ with the actual name of the server.

<pre>
sudo nano -w /etc/nginx/sites-available/search_[server name]_aroskanalen_dk
</pre>

<pre>
server {
  listen 80;

  server_name search-[server name].aroskanalen.dk;
  rewrite ^ https://$server_name$request_uri? permanent;

  access_log /var/log/nginx/search_access.log;
  error_log /var/log/nginx/search_error.log;
}

# HTTPS server
#
server {
  listen 443;

  server_name search-[server name].aroskanalen.dk;

  access_log /var/log/nginx/search_access.log;
  error_log /var/log/nginx/search_error.log;

  location / {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;

    proxy_buffering off;

    proxy_pass http://nodejs_search/;
    proxy_redirect off;
  }

  location /socket.io/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_pass http://nodejs_search;
  }

  ssl on;
  ssl_certificate /etc/nginx/ssl/[SSL CERT].crt;
  ssl_certificate_key /etc/nginx/ssl/[SSL KEY].key;

  ssl_session_timeout 5m;
  ssl_session_cache shared:SSL:10m;

  # https://hynek.me/articles/hardening-your-web-servers-ssl-ciphers/
  ssl_prefer_server_ciphers On;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS;
}
</pre>

Enable the configuration by adding a symbolic links for the search node. The nodejs configuration file should be linked during configuration of the middleware. Restart nginx to enable the configuration.

<pre>
cd /etc/nginx/sites-enabled/
sudo ln -s ../sites-available/search_[server name]_aroskanalen_dk
sudo service nginx restart
</pre>

Next the application needs to be configured by adding the following content to config.json. Remember to update the administration password and secret.

<pre>
sudo nano -w /home/www/search_node/config.json
</pre>

<pre>
{
  "port": 3010,
  "secret": "[CHANGE ME]",
  "admin": {
    "username": "admin",
    "password": "[PASSWORD]"
  },
  "log": {
    "file": "messages.log",
    "debug": false
  },
  "search": {
    "hosts": [ "localhost:9200" ],
    "mappings": "mappings.json"
  },
  "apikeys": "apikeys.json"
}
</pre>

Before the application can be started the _apikeys.json_ and _mappings.json_ needs to exist and at least contain an empty JSON object (_{}_).

<pre>
echo '{}' > /home/www/search_node/apikeys.json
echo '{}' > /home/www/search_node/mappings.json
</pre>

The search node needs to be started at boot time which requires a Supervisor run script. Supervisor will also ensure that the node application is restarted, if an error happens and it stops unexpectedly.

<pre>
sudo nano -w /etc/supervisor/conf.d/search_node.conf
</pre>

Supervisor run script for the search node.

<pre>
[program:search-node]
command=node /home/www/search_node/app.js
autostart=true
autorestart=true
environment=NODE_ENV=production
stderr_logfile=/var/log/search-node.err.log
stdout_logfile=/var/log/search-node.out.log
user=deploy
</pre>

<pre>
sudo service supervisor restart
</pre>

As mentioned the search node is not specially created for aroskanalen, so the mappings (configuration for elasticsearch) can be somewhat complex to setup in the UI. To get you started the mapping below can be used as a template for the configuration.

As we need the UI to complete the setup correctly the node application needs to have write access to the files.
<pre>
cd /home/www/search_node/
chmod +w apikeys.json mappings.json
</pre>

Now use the UI (https://search-[server name].aroskanalen.dk) and add a new api key. Then go to the mappings tabs in the UI and add a new empty mapping. Next edit the mappings file and add the _fields_, _tag_ and _dates_ section as in the template. This way you will get a new API key and search index key for each installation. __Note__ that each installation of the _admin_ application requires a new API key and search index.

<pre>
nano -w /home/www/search_node/mappings.json
</pre>

<pre>
{
  "5d437a016271077510c640e450bde9c3": {
    "name": "demo",
    "tag": "private",
    "fields": [
      {
        "field": "title",
        "type": "string",
        "language": "da",
        "country": "DK",
        "default_analyzer": "string_index",
        "sort": true,
        "indexable": true
      },
      {
        "field": "name",
        "type": "string",
        "language": "da",
        "country": "DK",
        "default_analyzer": "string_index",
        "sort": true,
        "indexable": true
      }
    ],
    "dates": [
      "created_at",
      "updated_at"
    ]
  }
}
</pre>

When you have update the mappings file go back into the UI and select the indexes that you need by edit the API key and select it/them in the edit window. Before a given index can be used you need to activate it in the _indexes_ tab. So do that now.

### UI

@TODO: How to use the UI to add more configuration.
