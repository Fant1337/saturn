# Настройка CDEK

Backend endpoint: `/api/cdek`.

Обязательные переменные окружения Vercel:

- `CDEK_CLIENT_ID` - client id из личного кабинета API CDEK.
- `CDEK_CLIENT_SECRET` - client secret из личного кабинета API CDEK.
- `SUPABASE_URL` - Project URL Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` - service role key Supabase. Нельзя добавлять его в браузерный код.

Дополнительные переменные:

- `CDEK_ENV=test` - использовать тестовый контур `https://api.edu.cdek.ru/v2`.
- `CDEK_BASE_URL` - свой base URL CDEK API.
- `CDEK_FROM_LOCATION_CODE` - код города отправителя. По умолчанию: `44` (Москва).
- `CDEK_SHIPMENT_POINT` - код офиса CDEK, из которого отправляете заказ. Если указан, заказ создается с `shipment_point`; иначе используется `from_location`.
- `CDEK_TARIFF_CODE` - код тарифа. По умолчанию: `136` (`Посылка склад-склад`).
- `CDEK_DELIVERY_POINT_TYPE` - по умолчанию `PVZ`; можно поставить `ALL`, чтобы показывать все пункты выдачи, которые вернет CDEK.
- `CDEK_DEFAULT_WEIGHT_GRAM` - вес товара по умолчанию для расчета CDEK. По умолчанию: `1000`.
- `CDEK_DEFAULT_LENGTH_CM`, `CDEK_DEFAULT_WIDTH_CM`, `CDEK_DEFAULT_HEIGHT_CM` - габариты упаковки по умолчанию.

После изменения переменных окружения нужно заново задеплоить проект Vercel.

Supabase SQL:

Выполните `supabase-schema.sql` в Supabase SQL Editor до проверки checkout. Схема содержит поля CDEK в `orders`, поле `delivery_price` и обновляет auth-триггеры так, чтобы профиль создавался только после подтверждения email.
