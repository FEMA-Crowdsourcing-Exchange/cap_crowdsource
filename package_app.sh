#!/bin/bash

copy_files() {
   if [ -n "$1" ]; then
       rsync -pvr js img css templates data setup.txt README.md doc  $1
       mkdir -p ${1}/app/db
       cp -pr app/db/review.db ${1}/app/db
       rsync -pr app/public app/review.html app/*py ${1}/app
   fi
}

package() {

  rm -rf tmp/*
  mkdir -p tmp/DamageReview
  copy_files tmp/DamageReview
  
  pushd tmp
  dt=`date +%s`
  dt="1505408134"
  zip -9 -r DamageApp_${dt}.zip DamageReview
  myZip="DamageApp_${dt}.zip"
  python -m awscli s3 cp ${myZip} s3://fema-capuploader-data/damageReview/${myZip} --acl public-read --profile fema_sandbox
  popd
}


predeploy() {
  :
}


package
predeploy



a="python -m awscli s3 cp DamageApp_1505408134.zip s3://fema-capuploader-data/damageReview/DamageApp_1505408134.zip --acl public-read --profile fema_sandbox"
