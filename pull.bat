REM Спрятать локальные изменения в закладку
git stash

REM Удалить записи закладок
git stash clear

REM извлечь данные с сервера и объединить
git pull --no-edit origin master

REM проверить по package.json наличие пакетов
npm install
