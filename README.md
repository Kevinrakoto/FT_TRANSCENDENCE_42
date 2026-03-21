#(DB view)
    docker compose exec app npx prisma studio

#(Make the change for the DB from shema prisma)
    docker compose exec app npx prisma db push && \
    docker compose exec postgres psql -U transcendence -d db_transcendence -c "\dt" && \


#(re-zero the db and make effect the modif on the Dockerfile)
    docker compose down -v
    docker compose up --build


#(Next Step create '/api/auth/me' for dashboard)
    npm install jsonwebtoken
    npm install --save-dev @types/jsonwebtoken

#(Rebuild tout depuis zéro avec les images de base les plus récentes)
    docker compose build --no-cache --pull