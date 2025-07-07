import routeros_api

# Update these with your router's details
HOST = '172.75.2.1'
USER = 'pingapi'
PASSWORD = 'password123'
PORT = 8728  # Default API port

connection = None
try:
    api = routeros_api.RouterOsApiPool(
        host=HOST,
        username=USER,
        password=PASSWORD,
        port=PORT,
        plaintext_login=True
    )
    connection = api.get_api()
    print('[TEST] Connected to MikroTik API!')
    resource = connection.get_resource('/ppp/secret')
    secrets = list(resource.get())
    print(f'[TEST] PPP secrets fetched: {secrets}')
except Exception as e:
    print(f'[TEST] Exception: {e}')
finally:
    if connection:
        api.disconnect() 