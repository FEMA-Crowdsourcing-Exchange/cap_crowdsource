### capReview.py

import simplejson as json


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

class imgDB():

    tgtReviews = 3

    def __init__(self, dbCls):
        self.dbCls = dbCls

    def getConn(self):
        if self.dbCls == "Prod":
            import pymssql
            dbHost = "<db host>"
            dbPort = 1433
            dbUser = "<db user>"
            dbPass = "<db pass>"
            dbName = "ImageReviews"
            db = pymssql.connect(host=dbHost, port=dbPort, user=dbUser, password=dbPass , database=dbName)
            self.dbName = "MS SQL"
        else:
            import sqlite3
            db = sqlite3.connect("db/review.db")
            self.dbName = "SQLite3"

        # automatically build named b=pairs for the DB
        db.row_factory = dict_factory
        return db
        
    def sqlSafe(data):
        if ';' in data or "\nGO" in data.upper():
            return False
        return True

    def validateSave(self, data):
        for fld in ['imageId','missionId','geo','generalStatus','ipAddr','session']:
            if not sqlSafe(fld):
                return False

        return True

    def saveAssessment(self, data):
        db = self.getConn()
        c = db.cursor()

        c.execute("""INSERT INTO assessment (id, mission_id, data, general_status, session_id, ip_address)
            SELECT '%s', %d, '%s', '%s', '%s', '%s';""" %(data["imageId"], 
                    int(json.dumps(data["missionId"])),
                    json.dumps(data["geo"]), json.dumps(data["generalStatus"]),
                    data["session"], data["ipAddr"]))

        # set the image status to in progress
        c.execute("""UPDATE review_queue SET lastReview = CURRENT_TIMESTAMP , status = 'p', reviews = reviews + 1 WHERE id = '%s' """ %(data["imageId"]))
        db.commit()
        
        return True

    def save(self, assessment):
        p = False
        if self.validateSave(assessment):
            p = self.saveAssessment(assessment)
        return p

    def nextImage(self):
        r = {}
        db = self.getConn()
        c = db.cursor()

        # only server allowed images
        c.execute("""SELECT id, imageurl, thumbnailurl, uploaddate, altitude, Latitude, Longitude, 
                EXIFPhotoDate, EXIFCameraMaker, EXIFCameraModel, EXIFFocalLength,
                imagemissionId, imageEventName, imageTeamName, imageMissionName
            FROM  review_queue
            WHERE reviews < %d and
              status in ('i','p')
            ORDER BY lastReview
            LIMIT 1;""" %(self.tgtReviews))
        r = c.fetchone()
        if len(r) > 0:
            print(r)
            print("serving image: %s" %(r["id"]))
            c.execute("""UPDATE review_queue SET lastReview = CURRENT_TIMESTAMP WHERE id = '%s' """ %(r["id"]))
            db.commit()
        else:
            # return a dummy image
            r = {}
        return r

    def retrieve(self, imageId):
        pass

    def releaseFlighttoReview(self, missionId):
        """
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
                    GROUP BY imageMissionId, imageEventName, imageTeamName, imageMissionName
            GO

        """
        pass

    def closeFlight(self, missionId):
        pass

    def reopenFlight(self, missionId):
        pass



def main():
    pass

if __name__ == "__main__":
    main()
