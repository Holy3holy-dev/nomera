# Фон NOMERA: промпты для генерации

В текущей версии игровое небо рисуется лёгким шейдером: холодный горизонт, мягкие облака и дальние силуэты. Оно реагирует на погоду и не требует загрузки видео на телефоне. Подписка Google в этом изменении не использовалась; ниже готовые промпты для самостоятельной генерации.

## Видео для фона сайта или меню

Предпочтительный результат: горизонтальный ролик без звука, 8 секунд, неподвижная камера. Для телефона достаточно лёгкой версии 720p; воспроизведение отключается при настройке уменьшения движения, статичный первый кадр остаётся подложкой. Конкретные длительность и разрешение зависят от выбранного инструмента.

```text
A seamlessly looping cinematic environment background for NOMERA, a premium automotive collection and street racing game. Locked-off camera, wide composition, quiet industrial city outskirts at blue hour. A distant layered skyline, dark forested hills and a soft steel-blue cloudy sky. Subtle cool reflections on wet asphalt in the lower quarter, restrained warm window lights far away. Slow, almost imperceptible cloud movement and a thin veil of atmospheric mist. Realistic materials, rich shadow detail, elegant muted navy, slate and silver palette. Balanced exposure, no yellow or sepia filter. Keep the middle of the frame calm and low contrast so a game interface remains readable. Continuous eight-second loop, first and last frame visually identical. No camera motion, no cuts, no zoom, no cars, no people, no text, no logos, no lightning, no flashing lights, no particles flying toward camera, no baked user interface. 16:9 landscape composition.
```

Это подложка меню. Для кругового неба в самой 3D-сцене нужен панорамный материал, а не обычное видео 16:9, натянутое на сферу.

## Статичная панорама для игрового неба

```text
A seamless 360-degree monoscopic equirectangular environment panorama, 2:1 aspect ratio, for a realistic street racing game sky dome. Cool blue-hour sky with soft layered clouds and delicate pale light near the horizon. A very distant low industrial skyline and dark forested hills occupy only a thin band along the horizon. Most of the panorama is open sky. Restrained navy, steel blue, slate and silver palette, realistic atmospheric depth, soft neutral illumination, detailed shadows, no yellow or sepia cast. Consistent horizon height and lighting all around the full 360-degree view. Left and right edges join perfectly without a seam. No road, no nearby buildings, no vehicles, no people, no text, no logos, no lens flare, no borders, no user interface. Keep the sun outside the frame and avoid a bright central hotspot.
```

Перед добавлением панорамы нужно проверить стык левого и правого края и положение горизонта. Сгенерированный ролик или изображение можно передать отдельным файлом для подготовки WebP/видео и подключения к игре.
