storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  # On pointe vers les certificats que le script va générer
  #tls_cert_file = "/vault/config/vault.crt"
  #tls_key_file  = "/vault/config/vault.key"
  tls_disable   = 1
}

api_addr = "https://127.0.0.1:8200"
disable_mlock = false
ui = true