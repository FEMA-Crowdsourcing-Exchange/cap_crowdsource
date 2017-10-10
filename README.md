FEMA CAP Crowdsource Damage Assessment Tool

   * This is a two part application
       * a Single page application
       * a server application that runs on port 8889

    * To run the server application
        * install python
        * install pip

        * install cherrypy, cherrypy_cors
            * python -m pip install -r requirements.txt --user
                
        * cd app
            * setup the sandbox database
            * setup the config file
                * either copy the devel version to config
                    * cp config_devel.py config.py
                * or copy and edit the config template
                    * cp config.py.template config.py                
                    * edit config.py
            * start the server
                * python app.py
