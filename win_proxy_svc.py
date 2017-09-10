## proxy_svc.py

import SocketServer
import SimpleHTTPServer
# import urllib
import urllib2
from config_env import *  

if config["env"] == "dev":

  PORT = 8888
  if config["proxy"] == "true":
    proxyHandler = {}
    proxyHandler[config["proxyProtocol"]] = config["proxyUrl"]
    proxy = urllib2.ProxyHandler(proxyHandler)
    opener = urllib2.build_opener(proxy)
    urllib2.install_opener(opener)
  class Proxy(SimpleHTTPServer.SimpleHTTPRequestHandler):
      def do_GET(self):
          print("req: " + self.path)
          if self.path.startswith('ImageEventsService/') or self.path[1:].startswith('ImageEventsService/'):
            self.send_response(200, 'OK')
            self.send_header('Content-type', 'application/json')
            self.send_header('Origin', '*')
            self.send_header('Host', config["host"])
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            newURL = "http://imageryuploader.geoplatform.gov" + self.path
            self.copyfile(urllib2.urlopen(newURL), self.wfile)
          else:
            SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
            #self.send_response(200, 'OK')
            #self.send_header('Content-type', 'html')
            #self.end_headers()
            #newURL = self.path[1:]

  
  # httpd = SocketServer.ForkingTCPServer(('', PORT), Proxy)
  httpd = SocketServer.ThreadingTCPServer(('', PORT), Proxy)
  print "serving at port", PORT
  httpd.serve_forever()
