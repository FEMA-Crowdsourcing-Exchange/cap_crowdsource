
#ctype="application/x-www-form-urlencoded"
ctype="application/json"
myCookie="session_id=3d66988472fcb025a8cc864a43afc1b01d1642ab"

tHost="http://0.0.0.0:8889"

Image() {
curl $tHost'/api/Save' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/'  --compressed -i 

}

Save() {
curl $tHost'/api/Save' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/' --data '{"geo":{"features":[{"geometry":{"coordinates":[474.0052080154419,-290.5052080154419],"type":"Point"},"properties":{"severity":"minor","Point":{"x":639,"y":431}},"type":"Feature"}],"type":"FeatureCollection"},"imageId":"0b265955-3a5e-4960-8bbb-073847b522ac"}' --compressed -i 
}

releaseFlightToReview() {
  flt="$1"
curl $tHost'/DamageReview/api/releaseFlightToReview' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/' --data '{"missionId": '${flt}'}' --compressed -i 
}

getFlights() {
curl $tHost'/DamageReview/api/getFlights' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/'  --compressed -i 
}

closeFlight() {
   flt="$1"
curl $tHost'/DamageReview/api/closeFlight' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/' --data '{"missionId": '${flt}'}' --compressed -i 
}

reopenFlight() {
  flt="$1"
curl $tHost'/DamageReview/api/reopenFlight' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/' --data '{"missionId": '${flt}'}' --compressed -i 
}

getActiveFlights() {
curl $tHost'/DamageReview/api/getActiveFlights' -H 'Pragma: no-cache' -H 'Origin: http://0.0.0.0:8889' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8' -H 'User-Agent: Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36' -H 'Content-Type: '$ctype'; charset=UTF-8' -H 'Accept: application/json, text/javascript, */*; q=0.01' -H 'Cache-Control: no-cache' -H 'X-Requested-With: XMLHttpRequest' -H "Cookie: _ga=GA1.1.1508062590.1501188867; $myCookie" -H 'Connection: keep-alive' -H 'Referer: http://0.0.0.0:8889/'  --compressed -i 
}

# 613586 - harvey
#  613592 - Irma



releaseFlightToReview 613592
closeFlight 613586

getActiveFlights


