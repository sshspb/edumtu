REM переместимся в папку с программой
d:
cd \test\edumtu

REM Спрятать локальные изменения в закладку
git stash

REM Удалить закладку
git stash clear

REM извлечь данные с сервера и объединить
git pull --no-edit origin master

REM проверить по package.json наличие пакетов
npm install --no-save
