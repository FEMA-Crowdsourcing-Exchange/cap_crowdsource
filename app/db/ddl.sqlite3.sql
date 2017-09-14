-- ddl.sql

CREATE TABLE review_queue (
    id  TEXT primary key,
    tid INTEGER default rowid,
    uploaddate  INTEGER,
    altitude    NUMERIC,
    latitude    NUMERIC,
    longitude   NUMERIC,
    exifphotodate   TEXT,
    exifcameramaker  TEXT,
    exifcameramodel  TEXT,
    exiffocallength  TEXT,
    imageMissionId   INTEGER,
    imageEventName  TEXT,
    imageTeamName TEXT,
    imageMissionName TEXT,
    imageurl    TEXT,
    thumbnailurl    TEXT,
    lastReview     INTEGER DEFAULT CURRENT_TIMESTAMP,
    reviews         INTEGER DEFAULT 0,
    status      TEXT DEFAULT '',
    shapeWKT    TEXT
);
CREATE INDEX review_queue__lastReview__ind on review_queue(lastReview);
CREATE INDEX review_queue__reviews__ind on review_queue(reviews);


CREATE TABLE assessment (
    assessment_id    INTEGER PRIMARY KEY DEFAULT rowid,
    id  TEXT,
    mission_id  INTEGER,
    session_id   TEXT,
    ip_address  TEXT,
    assessment_time     INTEGER DEFAULT CURRENT_TIMESTAMP,
    data    TEXT,
    general_status  TEXT
);
CREATE INDEX assessment__id__ind on assessment(id);


CREATE TABLE review_status (
    id  INTEGER,
    status TEXT
);

CREATE TABLE mission_review_status (
    imageMissionId  INTEGER PRIMARY KEY,
    imageEventName  TEXT,
    imageTeamName   TEXT,
    imageMissionName    TEXT,
    images  INTEGER,
    reviewed_images INTEGER,
    review_status   TEXT,
    review_start    INTEGER
);


---- =================

ATTACH DATABASE 'mirror.db' as mirror;

INSERT INTO review_queue (id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status)
   SELECT
        id, uploaddate, altitude, latitude, longitude,
        exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, 
        imageMissionId, imageEventName, imageTeamName, imageMissionName, imageurl, thumbnailurl, shape_wkt, 'i'
     FROM mirror.images
     WHERE imagemissionId = 613586 and
       latitude > 0;
     
INSERT INTO mission_review_status (imageMissionId, imageEventName, imageTeamName, imageMissionName, images, reviewed_images, review_status, review_start)
    SELECT  imageMissionId, imageEventName, imageTeamName, imageMissionName, count(*), 0, 'A', CURRENT_TIMESTAMP
        FROM  mirror.images
        WHERE imageMissionId = 613586 and
           latitude > 0
        GROUP BY 1;
