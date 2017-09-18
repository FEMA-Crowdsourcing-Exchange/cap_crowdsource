INSERT INTO review_queue (id, uploaddate, altitude, latitude, longitude, 
                exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, imageMissionId, imageEventName, imageTeamName, imageMissionName,
                imageurl, thumbnailurl, shapeWKT, status)
                SELECT
                     id, uploaddate, altitude, latitude, longitude,
                    exifphotodate, exifcameramodel, exifcameramaker, exiffocallength, 
                    imageMissionId, imageEventName, imageTeamName, imageMissionName, imageurl, thumbnailurl, shape.STAsText(), 'i'
                FROM imageevents.dbo.imageeventImages im
                WHERE im.imageeventId = 9074 and
                    im.latitude > 0 and
                    NOT EXISTS (SELECT 1 FROM review_queue mrs 
                            WHERE mrs.id = im.id);
GO

SELECT count(*),imagemissionid 
    FROM review_queue 
    GROUP BY imagemissionid 
    ORDER BY imagemissionID;
GO

SELECT count(*),imagemissionid, imageeventid
    FROM imageevents.dbo.imageeventimages 
    WHERE imageeventid in (9073, 9074) and latitude > 0
    GROUP BY imagemissionid, imageeventid;
GO


--- ===========


INSERT INTO mission_review_status (imageMissionId, 
            imageEventName, imageTeamName, imageMissionName, images, reviewed_images, review_status, review_start)
                SELECT  imageMissionId, imageEventName, imageTeamName, imageMissionName, count(*), 0, 'A', CURRENT_TIMESTAMP
                    FROM  imageevents.dbo.imageeventImages im
                    WHERE im.imageeventId = 9074 and
                        im.latitude > 0 and
                        NOT EXISTS (SELECT 1 FROM mission_review_status mrs 
                               WHERE mrs.imageMissionId = im.imageMissionId)
                    GROUP BY imageMissionId, imageEventName, imageTeamName, imageMissionName;
GO

SELECT count(*),imagemissionid 
    FROM mission_review_status 
    GROUP BY imagemissionid 
    ORDER BY imagemissionID;
GO
