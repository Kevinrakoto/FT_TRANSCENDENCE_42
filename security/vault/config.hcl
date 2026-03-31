storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/cert.pem"
  tls_key_file  = "/vault/certs/private-key.pem"
  tls_disable   = 0 
}

api_addr = "https://127.0.0.1:8200"
disable_mlock = false
ui = true