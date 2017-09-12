import os, os.path
import random
import sqlite3
import string
import time
import capReview
import cherrypy
from wdb.ext import WdbMiddleware

DB_STRING = "my.db"
WD = os.getcwd()

class serviceAPI(object):
    # _cp_config indicates that all the subsequent objects
    # are going to be pre/post processed as json documents
    # serializing and deserializing: JSON -> dict -> JSON
    # unless is "overwritten", which some do with the
    # cherrypy.config decorator.
    #_cp_config  = {'tools.json_out.on': True,
    #               'tools.json_in.on': True}

    def __init__(self):
        # The properties attribute correspond to the urls in the form:
        # /gists/ID/PROP, mapping: PROP -> METHOD -> FUNC
        #self.properties = {'Image': {'GET': self.Image},
        #                   'nextImage': {'GET': self.Image},
        #                   'save': {'POST': self.saveAssessment},
        #                   'saveAssessment': {'POST': self.saveAssessment}}
        pass

    @cherrypy.expose
    def index(self):
        return open('review.html')
    
    @cherrypy.expose
    def Image(self):
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
         '/api': {
             'request.dispatch': cherrypy.dispatch.MethodDispatcher(),
             'tools.response_headers.on': True,
             'tools.response_headers.headers': [('Content-Type', 'text/plain')],
         },
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
    #webapp.wsgiapp.pipeline.append(('debugger', WdbMiddleware))
    webapp.api = serviceAPI()

    cherrypy.quickstart(webapp, '/', conf)

