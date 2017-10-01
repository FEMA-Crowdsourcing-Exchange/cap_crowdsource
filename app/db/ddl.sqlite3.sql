-- ddl.sql

-- DROP TABLE review_queue;
CREATE TABLE review_queue (
    id  TEXT primary key,
    tid INTEGER default rowid,
    uploaddate  INTEGER,
    altitude    NUMERIC(7.1),
    latitude    NUMERIC(12,9),
    longitude   NUMERIC(12,9),
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

-- DROP TABLE assessment;
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

-- DROP TABLE review_status;
CREATE TABLE review_status (
    id  TEXT,
    status TEXT
);

-- DROP TABLE mission_review_status;
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
GO


-- DROP TABLE review_result;
GO
CREATE TABLE review_result (
    id  VARCHAR(40) primary key,
    tid INTEGER NOT NULL IDENTITY (1,1),
    uploaddate  DATETIME,
    altitude    NUMERIC(7,1),
    latitude    NUMERIC(12,9),
    longitude   NUMERIC(12,9),
    exifphotodate   DATETIME,
    exifcameramaker  VARCHAR(100),
    exifcameramodel  VARCHAR(100),
    exiffocallength  VARCHAR(100),
    imageMissionId   INTEGER,
    imageEventName  VARCHAR(80),
    imageTeamName VARCHAR(80),
    imageMissionName VARCHAR(80),
    imageurl    VARCHAR(150),
    thumbnailurl    VARCHAR(150),
    lastReview     DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviews         INTEGER DEFAULT 0,
    status      VARCHAR(50) DEFAULT '',
    num_affected    INTEGER NULL DEFAULT 0,
    num_dmg_minor   INTEGER NULL DEFAULT 0,
    num_dmg_major   INTEGER NULL DEFAULT 0,
    num_destroyed   INTEGER NULL DEFAULT 0,
    score   INTEGER NULL  DEFAULT 0,
    shapeWKT    VARCHAR(80),
    shape       GEOGRAPHY NOT NULL
);
CREATE INDEX review_result__imagemissionid__ind ON review_result(imagemissionid);
SET ansi_nulls on
SET quoted_identifier on
SET concat_null_yields_null on
SET ansi_warnings on
SET ansi_padding on
GO
CREATE INDEX review_result__shape__ind ON review_result(shape);  


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
        GROUP BY imageMissionId, imageEventName, imageTeamName, imageMissionName;

INSERT INTO review_result (id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status, shape)
   SELECT
      id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status, ST_GeomFromText(shapewkt, 4326)
      FROM
        review_queue
      ;

