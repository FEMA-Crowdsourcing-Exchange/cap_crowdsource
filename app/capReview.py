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
        if dbCls == "Prod":
            import pymssql
            dbHost = "<db host>"
            dbPort = 1433
            dbUser = "<db user>"
            dbPass = "<db pass>"
            dbName = "ImageEvents"
            self.db = pymssql.connect(host=dbHost, port=dbPort, user=dbUser, password=dbPass , database=dbName)
            self.dbName = "MS SQL"
        else:
            import sqlite3
            self.db = sqlite3.connect("db/cap_assessment.sb")
            self.dbName = "SQLite3"
        self.db.row_factory = dict_factory

    def validateSave(self, data):
        return true

    def saveAssessment(self, data):
        pass

    def save(self, assessment):
        p = False
        if self.validateSave(assessment):
            p = self.saveAssessment(assessment)
        return p

    def nextImage(self):
        r = {}
        with self.db.cursor() as c:
            c.execute("""SELECT id, imageurl, thumbnailurl, uploaddate, altitude, missionId, imageEventName, imageTeamName, imageMissionName
                FROM  review_queue
                WHERE reviews < %d
                ORDER BY last_review
                LIMIT 1;""" %(self.tgtReviews))
            r = c.fetchone()
            c.execute("""UPDATE review_queue SET lastReview = strftime('%s','now') WHERE id = '%s' """ %(r["id"]))
            self.db.commit()
        pass

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
