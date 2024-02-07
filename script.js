ymaps.ready(init);

function init() {
    var myMap = new ymaps.Map("map", {
        center: [55.751578, 37.573856],
        zoom: 9,
        controls: []
    }, {
        suppressMapOpenBlock: true
    });

    // Массив для хранения координат маркеров
    var placemarks = []; // Метки
    var clickCoords, nearestCoords; // Координаты
    var currentRoute = null; // Маршрут
    var locationPlacemark = null; // Местоположение

    //панель маршрутов
    var control = new ymaps.control.RoutePanel({
        options: {
            float: 'left',
            maxWidth: 220,
            fromEnabled: false,
            toEnabled: false,
            visible: false
        }
    });

    // Добавляем контрол на карту
    myMap.controls.add(control);

    // Кнопка поиска местоположения
    var findLocation = new ymaps.control.Button({
        data: {
            content: "🚶 Найти меня"
        },
        options: {
            maxWidth: 200
        }
    });

    // Кнопки обновления местоположения
    var updateYes = new ymaps.control.Button({
        data: {
            content: "Да"
        },
        options: {
            maxWidth: 150
        }
    });
    //
    var updateNo = new ymaps.control.Button({
        data: {
            content: "Нет"
        },
        options: {
            maxWidth: 150
        }
    });

    // Кнока сброса маршрута
    var closeRoute = new ymaps.control.Button({
        data: {
            content: "Сбросить маршрут"
        },
        options: {
            maxWidth: 150,
            visible: false
        }
    });

    // Добавляем кнопки
    myMap.controls.add(findLocation, {
        float: 'left',
        floatIndex: 100
    });

    myMap.controls.add(closeRoute, {
        float: 'left',
        floatIndex: 100
    });

    // Функция поиска местоположения
    function getCoords() {
        return new Promise(function (resolve, reject) {
            var geolocation = ymaps.geolocation;
            geolocation.get({
                provider: 'browser',
            }).then(function (result) {
                setCoords(result);
                resolve(locationPlacemark); // Разрешаем Promise с новой меткой
            }).catch(function (error) {
                // Если не удалось получить геолокацию через браузер, используем 'yandex'
                console.log("Переключаемся на определение местоположения через IP", error);
                geolocation.get({
                    provider: 'yandex',
                }).then(function (result) {
                    setCoords(result);
                    resolve(locationPlacemark);
                }).catch(function (error) {
                    console.error("Ошибка при получении местоположения через IP", error);
                    reject(error); // Отклоняем Promise с ошибкой
                });
            });
        });
    };

    // Функция обработки местоположения
    function setCoords(result) {
        // Удаление старой метки, если она существует
        if (locationPlacemark) {
            myMap.geoObjects.remove(locationPlacemark);
        }
        // Формирование метки
        var userCoords = result.geoObjects.get(0).geometry.getCoordinates();
        locationPlacemark = new ymaps.Placemark(userCoords, {
            iconContent: '🚶',
        }, {
            preset: 'islands#blueCircleIcon'
        });

        // Добавление новой метки на карту и центрирование карты
        myMap.geoObjects.add(locationPlacemark);
        myMap.setCenter(userCoords);

        // Сохраняем координаты в localStorage
        localStorage.setItem('userCoords', JSON.stringify(userCoords));

        document.getElementById('routePlacemark').innerText = 'Построить маршрут';
    };

    // Функция добавления метки
    function addPlacemark(id, coords, header, hint, content) {
        //Создание метки
        var placemark = new ymaps.Placemark(coords, { balloonContentHeader: header, hintContent: hint, balloonContentBody: content }, { preset: "islands#redDotIconWithCaption" });

        // Контекстное меню, позволяющее изменить параметры метки.
        // Вызывается при нажатии правой кнопкой мыши на метке.
        placemark.events.add('contextmenu', function (e) {
            e.stopPropagation();
            document.getElementById('contextMenu').style.display = 'none';
            // Если меню метки уже отображено, то убираем его.
            if ($(`#menu-${id}`).css('display') == 'block') {
                $(`#menu-${id}`).remove();
            } else {
                // HTML-содержимое контекстного меню.
                var menuContent =
                    `<div class="menu" id="menu-${id}">\
                        <div>
                            <b>Свойства метки:</b>
                            <span class="menu-close" style="cursor:pointer; text-align:right; padding: 5px;">&#10006;</span><hr/>\
                        </div>\
                        <div id="menu_list">\
                            <div>Заголовок: <br /> <input type="text" name="header_text" /></div>\
                            <div>Подсказка: <br /> <input type="text" name="hint_text" /></div>\
                            <div>Описание: <br /> <input type="text" name="balloon_text" /></div>\
                        </div>\
                        <div align="center"><hr/><input type="submit" value="Сохранить" /></div>\
                    </div>`;

                // Размещаем контекстное меню на странице
                $('body').append(menuContent);

                // Добавление обработчика события для кнопки закрытия
                $(`#menu-${id} .menu-close`).click(function () {
                    $(`#menu-${id}`).remove();
                });
                // Задаем позицию меню.
                $(`#menu-${id}`).css({
                    left: e.get('pagePixels')[0],
                    top: e.get('pagePixels')[1]

                });
                console.log(e.get('pagePixels'));
                // Заполняем поля контекстного меню текущими значениями свойств метки.
                $(`#menu-${id} input[name="header_text"]`).val(placemark.properties.get('balloonContentHeader'));
                $(`#menu-${id} input[name="hint_text"]`).val(placemark.properties.get('hintContent'));
                $(`#menu-${id} input[name="balloon_text"]`).val(placemark.properties.get('balloonContentBody'));

                // При нажатии на кнопку "Сохранить" изменяем свойства метки
                // значениями, введенными в форме контекстного меню.
                $(`#menu-${id} input[type="submit"]`).click(function () {
                    // Получаем введенные значения
                    var headerText = $('input[name="header_text"]').val();
                    var hintText = $('input[name="hint_text"]').val();
                    var balloonText = $('input[name="balloon_text"]').val();
                    // Обновляем свойства метки
                    placemark.properties.set({
                        balloonContentHeader: headerText,
                        hintContent: hintText,
                        balloonContentBody: balloonText
                    });

                    // Находим индекс метки в массиве placemarks по id
                    var index = placemarks.findIndex(function (element) {
                        return element[0] === id;
                    });

                    // Если метка найдена, обновляем ее данные в массиве
                    if (index !== -1) {
                        placemarks[index] = [id, placemarks[index][1], headerText, hintText, balloonText];
                    }

                    // Сохраняем обновленный массив в localStorage
                    localStorage.setItem('placemarks', JSON.stringify(placemarks));

                    // Удаляем контекстное меню.
                    $(`#menu-${id}`).remove();
                });
            }
        });
        myMap.geoObjects.add(placemark);
    };

    // Функция поиска ближайшей метки к координатам нажатия
    function findNearestPlacemarkIndex(clickCoords) {
        let nearestDistance = Infinity;
        let nearestPlacemarkIndex = -1;

        placemarks.forEach((placemark, index) => {

            const coords = placemark[1];
            const distance = ymaps.coordSystem.geo.getDistance(clickCoords, coords);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlacemarkIndex = index;
            }
        });

        return nearestPlacemarkIndex;
    };

    // Функция удаления метки
    function removePlacemarkByIndex(index) {
        if (index !== -1) {
            const nearestCoords = placemarks[index][1];

            //Если к метке построен маршрут удаляем его
            myMap.geoObjects.each(function (geoObject) {
                if (geoObject.geometry && geoObject.geometry.getType() === 'Point') {
                    const coords = geoObject.geometry.getCoordinates();
                    if (coords[0] === nearestCoords[0] && coords[1] === nearestCoords[1]) {
                        myMap.geoObjects.remove(geoObject);
                        console.log("Ближайшая метка удалена с карты.");
                    }
                }
            });
            // Удаляем метку
            placemarks.splice(index, 1);
            localStorage.setItem('placemarks', JSON.stringify(placemarks));
            console.log("Метка удалена из массива placemarks.");
        } else {
            console.log("Индекс метки неверен.");
        }
    };

    // Функция построения маршрута
    function buildRoute(locationPlacemark, clickCoords) {
        closeRoute.options.set({
            visible: true
        });

        // Находим индекс ближайшей метки к координатам клика
        let nearestPlacemarkIndex = findNearestPlacemarkIndex(clickCoords);
        if (nearestPlacemarkIndex === -1) {
            console.log("Ближайшие метки не найдены.");
            return;
        }

        // Получаем координаты ближайшей метки
        let nearestCoords = placemarks[nearestPlacemarkIndex][1];

        localStorage.setItem('routeEndPoint', JSON.stringify(nearestCoords));

        // Если уже существует маршрут, удаляем его
        if (currentRoute) {
            myMap.geoObjects.remove(currentRoute);
        }

        // Получаем начальные координаты маршрута
        let startCoords = locationPlacemark.geometry.getCoordinates();

        // Задаем маршрут
        //control.routePanel.geolocate('from');
        control.routePanel.state.set({
            type: "auto",
            fromEnabled: false,
            toEnabled: false,
            from: startCoords.join(', '),
            to: nearestCoords.join(', ')
        });

        // Построение маршрута
        control.routePanel.getRouteAsync().then(function (route) {
            control.options.set({
                visible: true
            });
            currentRoute = route;
            myMap.geoObjects.add(route); // Добавляем маршрут на карту
        });
    };

    function displayWeather(data) {
        // Базовая информацию о погоде
        cond = {
            'clear': 'ясно',
            'partly-cloudy': 'малооблачно',
            'cloudy': 'блачно с прояснениями',
            'overcast': 'пасмурно',
            'light-rain': 'небольшой дождь',
            'rain': 'дождь',
            'heavy-rain': 'сильный дождь',
            'showers': 'ливень',
            'wet-snow': 'дождь со снегом',
            'light-snow': 'небольшой снег',
            'snow': 'снег',
            'snow-showers': 'снегопад',
            'hail': 'град',
            'thunderstorm': 'гроза',
            'thunderstorm-with-rain': 'дождь с грозой',
            'thunderstorm-with-hail': 'гроза с градом'
        };

        var placemark = new ymaps.Placemark(clickCoords, {
            // Зададим содержимое заголовка балуна.
            balloonContentHeader: '',
            // Зададим содержимое основной части балуна.
            balloonContentBody: `
            <p class="wInfo">Температура: ${data.fact.temp}°C</p>\
            <p class="wInfo">Ощущается как: ${data.fact.feels_like}°C</p>\
            <p class="wInfo">${cond[data.fact.condition]}</p>\
            <p class="wInfo">Скорость ветра: ${data.fact.wind_speed} м/с</p>\
            <p class="wInfo">Давление: ${data.fact.pressure_mm} мм рт. ст.</p>\
            <p class="wInfo">Влажность: ${data.fact.humidity}%</p>`
        });
        // Добавим метку на карту.
        myMap.geoObjects.add(placemark);
        // Откроем балун на метке.
        placemark.balloon.open();

        // Подписываемся на событие закрытия балуна
        placemark.events.add('balloonclose', function () {
            // При закрытии балуна удаляем метку с карты
            myMap.geoObjects.remove(placemark);
        });
    };

    // Обработка нажатия кнопки поиска местоположения
    findLocation.events.add('click', function () {
        findLocation.select();
        //скрываем контекстное меню
        document.getElementById('contextMenu').style.display = 'none';
        if (localStorage.getItem('userCoords')) {

            findLocation.data.set('content', "Обновить координаты?");
            findLocation.disable();
            myMap.controls.add(updateYes, {
                float: 'left',
                floatIndex: 99
            });
            myMap.controls.add(updateNo, {
                float: 'left',
                floatIndex: 98
            });
        }
        else {
            getCoords();
        }
    });

    findLocation.events.add('contextmenu', function (e) {
        e.preventDefault();
    });

    // Обработка кнопок обновления маршрута
    updateYes.events.add('click', function () {
        updateYes.select();
        myMap.controls.remove(updateYes);
        myMap.controls.remove(updateNo);
        findLocation.data.set('content', "🚶 Найти меня");
        findLocation.enable();
        findLocation.deselect();
        getCoords();
    });

    updateNo.events.add('click', function () {
        updateNo.select();
        myMap.controls.remove(updateYes);
        myMap.controls.remove(updateNo);
        findLocation.data.set('content', "🚶 Найти меня");
        findLocation.enable();
        findLocation.deselect();
    });

    // Обработка кнопки сброса маршрута
    closeRoute.events.add('click', function () {
        closeRoute.select();
        myMap.geoObjects.remove(currentRoute);
        control.routePanel.state.set({
            fromEnabled: false,
            from: '',
            to: ''
        });
        control.options.set({
            visible: false
        });
        localStorage.removeItem('routeEndPoint');
        closeRoute.options.set({
            visible: false
        });
    });

    // При загрузке проверяем наличие сохраненного местоположения в licalStaorage и добавляем на карту
    if (localStorage.getItem('userCoords')) {
        savedUserCoords = JSON.parse(localStorage.getItem('userCoords'));
        userCoordsPlacemark = new ymaps.Placemark(savedUserCoords, {
            iconContent: '🚶'
        }, {
            preset: 'islands#blueCircleIcon'
        });
        myMap.geoObjects.add(userCoordsPlacemark);
        myMap.setCenter(savedUserCoords);

        locationPlacemark = userCoordsPlacemark;
    } else {
        document.getElementById('routePlacemark').innerText = 'Найти меня и построить маршрут';
    };

    // При загрузке проверяем наличие меток в licalStaorage и добавляем их на карту
    if (localStorage.getItem('placemarks')) {
        var savedPlacemarks = JSON.parse(localStorage.getItem('placemarks'));

        savedPlacemarks.forEach((coords) => {
            //console.log(coords[0]);
            addPlacemark(coords[0], coords[1], coords[2], coords[3], coords[4]);
        });

        placemarks = savedPlacemarks;
    };

    // Обработка для контектного меню
    myMap.events.add('contextmenu', function (e) {
        // Получаем координаты клика на странице
        var coords = e.get('pagePixels');

        if (placemarks.length == 0) {
            document.getElementById('deletePlacemark').style.display = 'none';
            document.getElementById('routePlacemark').style.display = 'none';
        } else {
            document.getElementById('deletePlacemark').style.display = 'block';
            document.getElementById('routePlacemark').style.display = 'block';
        }

        // Показываем контекстное меню
        var menu = document.getElementById('contextMenu');
        menu.style.left = coords[0] + 'px';
        menu.style.top = coords[1] + 'px';
        menu.style.display = 'block';

        localStorage.setItem('clickCoords', JSON.stringify(e.get('coords')));

        // Предотвращаем стандартное контекстное меню браузера
        e.preventDefault();
    });

    // Скрываем меню при клике на карту
    myMap.events.add('click', function () {
        document.getElementById('contextMenu').style.display = 'none';
    });

    // Обработчик пунктов меню
    document.getElementById('contextMenu').addEventListener('click', function (e) {
        if (e.target.tagName === 'DIV') {
            document.getElementById('contextMenu').style.display = 'none';

            clickCoords = JSON.parse(localStorage.getItem('clickCoords'));

            switch (e.target.textContent) {
                case 'Добавить метку':
                    var id = Date.now();
                    addPlacemark(id, clickCoords, "Заголовок", "Подсказка", "Тело сообщения");

                    // Добавление координат в массив
                    placemarks.push([id, clickCoords, "Заголовок", "Подсказка", "Тело сообщения"]);
                    // Сохранение массива координат в localStorage
                    localStorage.setItem('placemarks', JSON.stringify(placemarks));
                    break;
                case 'Удалить метку':
                    // Ищем ближайшую метку
                    let nearestPlacemarkIndex = findNearestPlacemarkIndex(clickCoords);
                    //Если маршрут построен к удаляемой метке удаляем маршрут и скрываем панель
                    if (currentRoute) {
                        routeEndPoint = localStorage.getItem('routeEndPoint');

                        if (JSON.stringify(placemarks[nearestPlacemarkIndex][1]) === routeEndPoint) {
                            myMap.geoObjects.remove(currentRoute);
                            control.routePanel.state.set({
                                fromEnabled: false,
                                from: '',
                                to: ''
                            });
                            control.options.set({
                                visible: false
                            });
                            localStorage.removeItem('routeEndPoint');
                        }
                    }
                    // Использование функции для удаления найденной метки
                    removePlacemarkByIndex(nearestPlacemarkIndex);
                    break;
                case 'Построить маршрут':
                    buildRoute(locationPlacemark, clickCoords);
                    break;
                case 'Найти меня и построить маршрут':
                    getCoords().then(function () {
                        buildRoute(locationPlacemark, clickCoords);
                    });
                    break;
                case 'Информация о погоде':
                    // Используется Тестовы ключ API Яндекс погоды, срок действия ограничен 30 днями
                    fetch(`http://217.18.62.180:3000/weather?lat=${clickCoords[0]}&lon=${clickCoords[1]}`)
                        .then(response => response.json())
                        .then(data => displayWeather(data))
                        .catch(error => console.error('Ошибка:', error));
                    break;
            }
        }
    });
};


// Проверка совместимости с HTML5
document.getElementById('checkCompatibility').addEventListener('click', function () {
    let result = '';
    if ('geolocation' in navigator) {
        document.getElementById('compatibilityResult').className = 'good-result';
        result += 'Ваш браузер поддерживает Geolocation API. ';
    } else {
        document.getElementById('compatibilityResult').className = 'bad-result';
        result += 'Ваш браузер не поддерживает Geolocation API. ';
    }

    document.getElementById('compatibilityResult').innerHTML = result;
});
