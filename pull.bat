REM Спрятать локальные изменения в скрытую закладку
git stash

REM Удалить записи закладок
git stash clear

REM извлечь (fetch) данные с сервера и слить (merge) их с локальным кодом
git pull --no-edit origin master

REM проверить по package.json наличие пакетов и скачать если необходимо
npm install
