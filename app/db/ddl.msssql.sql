-- ddl.sql
use ImageReviews;
GO

-- DROP TABLE review_queue;
GO
CREATE TABLE review_queue (
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
    shapeWKT    VARCHAR(80)
);
CREATE INDEX review_queue__lastReview__ind on review_queue(lastReview);
CREATE INDEX review_queue__reviews__ind on review_queue(reviews);
GO

-- DROP TABLE assessment;
GO
CREATE TABLE assessment (
    assessment_id  INTEGER NOT NULL IDENTITY (1,1) PRIMARY KEY,
    id  VARCHAR(40),
    mission_id  INTEGER,
    session_id   VARCHAR(50),
    ip_address  VARCHAR(25),
    assessment_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
    data    VARCHAR(max),
    general_status  VARCHAR(50)
);
CREATE INDEX assessment__id__ind on assessment(id);
GO


-- DROP TABLE review_status;
GO
CREATE TABLE review_status (
    id  VARCHAR(40) NOT NULL PRIMARY KEY,
    status VARCHAR(500)
);
GO

-- DROP TABLE mission_review_status;
GO
CREATE TABLE mission_review_status (
    imageMissionId  INTEGER NOT NULL PRIMARY KEY,
    imageEventName  VARCHAR(50),
    imageTeamName   VARCHAR(50),
    imageMissionName    VARCHAR(50),
    images  INTEGER,
    reviewed_images INTEGER,
    review_status   VARCHAR(50),
    review_start    DATETIME
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
CREATE SPATIAL INDEX review_result__shape__ind ON review_result(shape);  
GO


---- =================


INSERT INTO dbo.review_queue (id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status)
   SELECT
        id, uploaddate, altitude, latitude, longitude,
        exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, 
        imageMissionId, imageEventName, imageTeamName, imageMissionName, imageurl, thumbnailurl, shape.STAsText(), 'i'
     FROM ImageEvents.dbo.imageeventImages
     WHERE imagemissionId = 613586 and
       latitude > 0;
GO

INSERT INTO dbo.mission_review_status (imageMissionId, imageEventName, imageTeamName, imageMissionName, images, reviewed_images, review_status, review_start)
    SELECT  imageMissionId, imageEventName, imageTeamName, imageMissionName, count(*), 0, 'A', CURRENT_TIMESTAMP
        FROM  ImageEvents.dbo.imageeventImages
        WHERE imageMissionId = 613586 and
           latitude > 0
        GROUP BY imageMissionId, imageEventName, imageTeamName, imageMissionName;
GO

INSERT INTO dbo.review_result (id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status, shape)
   SELECT
      id, uploaddate, altitude, latitude, longitude, 
      exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
      imageurl, thumbnailurl, shapeWKT, status, GEOGRAPHY::STGeomFromText(shapewkt, 4326)
      FROM
        review_queue
      ;
GO
