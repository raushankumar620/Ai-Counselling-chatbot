from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["user_database"]  # Database Name
users_collection = db["users"]  # Collection Name
