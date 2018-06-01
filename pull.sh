#!/bin/sh

# Спрятать локальные изменения в закладку
git stash

# Удалить закладку
git stash clear

# извлечь данные с сервера и объединить
git pull --no-edit origin master

# проверить по package.json наличие пакетов
npm install --no-save
