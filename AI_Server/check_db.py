import sqlite3

# Connect to the database
conn = sqlite3.connect('embeddings.db')
cursor = conn.cursor()

# Check if the table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='embeddings'")
if cursor.fetchone():
    # Get all records from the embeddings table
    cursor.execute('SELECT name FROM embeddings')
    rows = cursor.fetchall()
    
    print('Database contents:')
    for row in rows:
        print(row[0])
else:
    print("The 'embeddings' table doesn't exist")

# Close the connection
conn.close()
