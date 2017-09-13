### capReview.py

import json


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
            dbName = "ImageEvents"
            db = pymssql.connect(host=dbHost, port=dbPort, user=dbUser, password=dbPass , database=dbName)
            self.dbName = "MS SQL"
        else:
            import sqlite3
            db = sqlite3.connect("db/review.db")
            self.dbName = "SQLite3"
        db.row_factory = dict_factory
        return db
        
    def validateSave(self, data):
        return true

    def saveAssessment(self, data):
        db = self.getConn()
        c = db.cursor()

        c.execute("""INSERT INTO assessment (id, data, sessionId, ip_address)
            SELECT '%s', '%s', '%s', '%s';""" %(data["imageId"], json.dumps(data["geo"]), data["session"], data["ipAddr"]))
        c.execute("""UPDATE review_queue SET lastReview = CURRENT_TIMESTAMP , reviews = reviews + 1 WHERE id = '%s' """ %(data["imageId"]))
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

        c.execute("""SELECT id, imageurl, thumbnailurl, uploaddate, altitude, Latitude, Longitude, 
                EXIFPhotoDate, EXIFCameraMaker, EXIFCameraModel, EXIFFocalLength,
                imagemissionId, imageEventName, imageTeamName, imageMissionName
            FROM  review_queue
            WHERE reviews < %d
            ORDER BY lastReview
            LIMIT 1;""" %(self.tgtReviews))
        r = c.fetchone()
        c.execute("""UPDATE review_queue SET lastReview = CURRENT_TIMESTAMP WHERE id = '%s' """ %(r["id"]))
        db.commit()
        return r

    def retrieve(self, imageId):
        pass

    def releaseFlighttoReview(self, missionId):
        pass

    def closeFlight(self, missionId):
        pass

    def reopenFlight(self, missionId):
        pass



def main():
    pass

if __name__ == "__main__":
    main()
