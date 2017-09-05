## proxy_svc.py

import SocketServer
import SimpleHTTPServer
import urllib

PORT = 8888

class Proxy(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def do_GET(self):
        print("req: " + self.path)
        if self.path.startswith('ImageEventsService/') or self.path[1:].startswith('ImageEventsService/'):
          self.send_response(200, 'OK')
          self.send_header('Content-type', 'application/json')
          self.end_headers()
          newURL = "http://imageryuploader.geoplatform.gov" + self.path
          self.copyfile(urllib.urlopen(newURL), self.wfile)

        else:
        	 SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
          #self.send_response(200, 'OK')
          #self.send_header('Content-type', 'html')
          #self.end_headers()
          #newURL = self.path[1:]

 
httpd = SocketServer.ForkingTCPServer(('', PORT), Proxy)
print "serving at port", PORT
httpd.serve_forever()
