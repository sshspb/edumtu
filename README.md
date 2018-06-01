# edumtu

### Отчётная подсистема финансово-экономической учета СПбГМТУ

### Установка программы
#### OS MS Windows.

1. Загрузить `Node.JS` с официального сайта ` https://nodejs.org `и установить.

2. Загрузить MongoDB с официального сайта ` https://www.mongodb.com/download-center#community ` и установить в папку, например в ` D:\mongo\ `, тут желательно чтобы в пути к папке не было русских букв и пробелов.

3. По умолчанию MongoDB полагает что база данных находится в папке ` /data/db ` того же тома.  Создаём папку для базы данных

    `mkdir D:\data\db`

4. Запускаем MongoDB сервер `D:\mongo\mongod.exe` . Прервать работу MongoDB сервера можно по `<Ctrl>+C`

5. В окне (терминале) `Git` перейти в папку куда надо будет поместить папку сайта и забрать из хранилища исходники

    `git clone https://github.com/sshspb/edumtu.git`
 
6. В терминале, `Windows` или `Git`, перейти в созданную на предыдущем шаге папку `edumtu` и дать команду `npm install`, которая скачает из интернета необходимые для сайта модули `Node.JS` 

    `cd edumtu`
    
    `npm install`
 
7. Для хранения локальных уставок создай из шаблона `config_local.js.origin` локальный (местный) файл `config_local.js`

    `cp config_local.js.origin config_local.js`
  
И пропиши в `config_local.js` необходимые уставки, в частности, укажи путь к папке с данными, например

    `"tbPath": "D:/data/Inet_arch/Inet_2017"`

8. Запускается веб-сервер командой

    `npm start`
    
Прервать работу веб-сервера можно по `<Ctrl>+C`
 
9. В адресной строке веб-броузера набрать адрес `localhost:3000`. На появившейся странице сайта в меню есть пункт `"Импорт данных"` - жмём - данные загрузятся из указанной в файле `config_local.js` папки `"tbPath"`.

10. Чтобы обновить версию сайта запускаем командный файл
    `pull.bat`

#### OS FreeBSD.

Установить необходимое ПО
```
# pkg install git
# pkg install node
# pkg install npm
# pkg install mongodb36
```
Создать папку для базы данных
```
# mkdir -p /data/db
# chown mongodb:mongodb /data/db
```
Для автозапуска `mongod` добавить в файл `/etc/rc.conf` строку `mongod_enable="YES"` с помощью редактора `vi`.

Перезагружаем FreeBSD
```
# shutdown -r now
```
Заходим обычным пользователем, предположим под именем `edu`, и выполняем
```
$ git clone https://github.com/sshspb/edumtu.git
$ cd edumtu
$ npm install
$ cp config_local.js.origin config_local.js
 ```
Наконец
- Разместить файлы с данными от 1С например в папке `/usr/home/edu/data1c`, 
- отредактировать `config_local.js`
- и запустить сайт 
```
$ npm start
```
Командный файл `pull.sh` объявить исполнимым 
```
$ chmod +x pull.sh
```
и с его помощью в дальнейшем обновлять версию сайта
```
$ ./pull.sh
```

### Администратор

На странице администратора сайта есть навигационные кнопки:
- `"Экономисты"` - здесь можно добавить/редактировать/удалить пользователя с 'ролью' "экономист", с правом полного доступа к информации на сайте.
- `"Руководители"`, тут список ответственных исполнителей договоров из базы данных - здесь можно предоставить/убрать пароль пользователя сайта (у них 'роль' "мастер").
- `"Подразделения"`, тут представлена организационная структура из базы данных - администратор здесь может указать кто из ответственных исполнителей договоров является начальником какого подразделения.
- `"Администратор"` - возможность сменить пароль администратора.

Руководителю подразделения необходимо выдавать информацию в рамках его сферы ответственности.
К сожалению в базе данных отсутствуют сведения кто каким подразделением руководит.
Администратору предоставлена возможность указывать, выбором из списка ответственных исполнителей договоров, кто является руководителем какого подразделения.

Итак, 
- Пользователям с ролью "экономист" предоставляется доступ ко всей информации, без ограничений.
- Руководителю договора обеспечен доступ только к своим договорам;
- Руководителю подразделения обеспечен доступ ко всем договорам непосредственно своего подразделения и подразделений ниже по подчинённости.

#### Пароль администратора

Изначально у администратора login/password  `admin` / `admin`.

Password можно, и рекомендуется, менять, на сайте в личном кабинете администратора. 
Login `admin` остаётся неизменным.

#### Если утрачен пароль администратора

Пароли пользователей хранятся в коллекции users  в зашифрованном виде, а именно хранится пара 

- соль (модификатор), случайное, для каждого пользователя, число
```
salt = Math.random() + '';
```

- код аутентификации, использующий хеш-функции (hash-based message authentication code, HMAC), 
```
hashedPassword = crypto.createHmac('sha1', salt).update(Password).digest('hex');
```
где используются функции nodejs модуля crypto  https://nodejs.org/api/crypto.html

Первоначально у администратора пароль  `admin`  в зашифрованном виде имеет вид
```
"salt" : "0.8189392053428559"
"hashedPassword" : "f7db7aab4b2b0c2fed80f2802df9d2d434fb3fc4"
```
При необходимости восстановления значения  password , то есть для редактирования полей `salt` и `hashedPassword` в коллекции `user`, можно воспользоваться штатной клиентской утилитой `mongo` (она находится в той же папке где и сервер `mongod`).

Для восстановления значения password  `admin` запустите утилиту `mongo` и выполните в ней следующие три команды:

```
use edu

db.users.updateOne(
  {"role" : "admin", "login" : "admin"}, 
  { $set: {
    salt: "0.8189392053428559", 
    hashedPassword: "f7db7aab4b2b0c2fed80f2802df9d2d434fb3fc4"
  }}, 
  { upsert: true })

exit
```
Существуют также GUI-программы, которые предоставляют более удобные, интуитивно понятные, средства просмотра и редактирования, например free tools:
- Robo 3T  https://robomongo.org 
- MongoDB Compass Community  https://www.mongodb.com/products/compass 
 ​