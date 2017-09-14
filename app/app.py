import os, os.path
import random
import sqlite3
import string
import time
import capReview
import cherrypy
import cherrypy_cors
import simplejson as json

DB_STRING = "my.db"
WD = os.getcwd()

def cors():
  if cherrypy.request.method == 'OPTIONS':
    # preflign request 
    # see http://www.w3.org/TR/cors/#cross-origin-request-with-preflight-0
    cherrypy.response.headers['Access-Control-Allow-Methods'] = 'GET, POST'
    cherrypy.response.headers['Access-Control-Allow-Headers'] = 'content-type'
    cherrypy.response.headers['Access-Control-Allow-Origin']  = '*'
    # tell CherryPy no avoid normal handler
    return True
  else:
    cherrypy.response.headers['Access-Control-Allow-Origin'] = '*'

cherrypy.tools.cors = cherrypy._cptools.HandlerTool(cors)

class serviceAPI(object):
    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def Image(self):
        cherrypy.response.headers['Content-Type'] = "application/json;  charset=utf-8" 
        #return "rr"
        return CAP.nextImage()

    # allow:
    #  application/x-www-form-urlencoded;
    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    @cherrypy.tools.json_out()
    #@cherrypy.tools.json_in()
    #@request.cookie["session_id"]["id"]
    @cherrypy.config(**{'tools.json_in.force': False})
    def Save(self, **kwargs):
        cl = cherrypy.request.headers['Content-Length']
        rawbody = cherrypy.request.body.read(int(cl))
        data = json.loads(rawbody)

        if not cherrypy.session.id == None:
            data["session"] = str(cherrypy.session.id)
            data["ipAddr"] = cherrypy.request.remote.ip
            
            print(data)
            result = CAP.saveAssessment(data)
            if result == True:
                return {"status": "succeeded"}
            else:
                return {"status": "failed"}
        else:
            return {"status": "failed"}

class API(object):
    @cherrypy.expose
    def index(self):
        return open('review.html', 'r')

def application(env, start_response):
    start_response('200 OK', [('Content-Type', 'text/html')])
    return ["Hello!"]

if __name__ == '__main__':
    
    conf = {
        '/': {
             'tools.sessions.on': True,
             'tools.staticdir.root': os.path.abspath(os.getcwd())
         },
         #'/api': {
             #'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
             #'tools.response_headers.on': True,
             #'tools.response_headers.headers': [('Content-Type', 'text/plain')],
         #},
        '/public': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/public'
        },    
        '/js': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/../js'
        },
        '/css': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/../css'
        },
        '/img': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/../img'
        },
        '/templates': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/../templates'
        },
        '/data': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/../data'
        },
        '/favicon.ico': {
                'tools.staticfile.on': True,
                'tools.staticfile.filename': WD + '/../img/fema.ico'
        }
    }

    cherrypy_cors.install()
    cherrypy.config.update({'global':{'request.throw_errors': True}})
    cherrypy.config.update({'server.socket_host': '0.0.0.0',
                        'server.socket_port': 8889,
                       })
    
    #cherrypy.engine.subscribe('start', setup_database)
    #cherrypy.engine.subscribe('stop', cleanup_database)
    CAP = capReview.imgDB('Devel')
    #CAP = capReview.imgDB('Prod')

    webapp = API()
    webapp.api = serviceAPI()

    cherrypy.quickstart(webapp, '/', conf)

