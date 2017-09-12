import os, os.path
import random
import sqlite3
import string
import time
import capReview
import cherrypy

DB_STRING = "my.db"
WD = os.getcwd()

class serviceAPI(object):
    @cherrypy.expose
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def Image(self):
        cherrypy.response.headers['Content-Type'] = "application/json;  charset=utf-8" 
        #return "rr"
        return CAP.nextImage()

    @cherrypy.expose
    def saveAssessment(self):
        return CAP.saveAssessment(object)

class API(object):
    @cherrypy.expose
    def index(self):
        return open('review.html', 'r')

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
            'tools.staticdir.dir': WD + '/public/js'
        },
        '/css': {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': WD + '/public/css'
        },
        '/favicon.ico': {
                'tools.staticfile.on': True,
                'tools.staticfile.filename': os.path.join(os.getcwd(), './public/images/fema.ico')
        }
    }

    cherrypy.config.update({'global':{'request.throw_errors': True}})
    cherrypy.config.update({'server.socket_host': '0.0.0.0',
                        'server.socket_port': 8888,
                       })
    
    #cherrypy.engine.subscribe('start', setup_database)
    #cherrypy.engine.subscribe('stop', cleanup_database)
    CAP = capReview.imgDB('Devel')

    webapp = API()
    webapp.api = serviceAPI()

    cherrypy.quickstart(webapp, '/', conf)

