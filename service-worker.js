const CACHE_VERSION = 'grade-admin-v3';

const APP_SHELL_CACHE =
  `${CACHE_VERSION}-shell`;

const RUNTIME_CACHE =
  `${CACHE_VERSION}-runtime`;


/*
 * =========================================================
 * ไฟล์หลักของระบบ
 * =========================================================
 */

const APP_SHELL = [

  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',

  './pwa-register.js',

  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'

];


/*
 * =========================================================
 * INSTALL
 *
 * ไม่ใช้ cache.addAll()
 * เพราะถ้าไฟล์เดียว 404 จะทำให้ install ล้มทั้งชุด
 * =========================================================
 */

self.addEventListener(
  'install',
  event => {

    event.waitUntil(

      caches
        .open(APP_SHELL_CACHE)

        .then(async cache => {

          for(
            const asset
            of APP_SHELL
          ){

            try{

              const response =
                await fetch(
                  asset,
                  {
                    cache: 'no-cache'
                  }
                );


              if(!response.ok){

                console.warn(
                  '[Service Worker] ข้ามไฟล์:',
                  asset,
                  'HTTP',
                  response.status
                );

                continue;

              }


              await cache.put(
                asset,
                response
              );


              console.log(
                '[Service Worker] Cached:',
                asset
              );


            }catch(error){

              console.warn(
                '[Service Worker] Cache ไม่สำเร็จ:',
                asset,
                error
              );

            }

          }

        })

        .then(() =>
          self.skipWaiting()
        )

    );

  }
);


/*
 * =========================================================
 * ACTIVATE
 *
 * ลบ Cache เวอร์ชันเก่า
 * =========================================================
 */

self.addEventListener(
  'activate',
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(keys =>

          Promise.all(

            keys

              .filter(key =>

                key !== APP_SHELL_CACHE &&
                key !== RUNTIME_CACHE

              )

              .map(key =>
                caches.delete(key)
              )

          )

        )

        .then(() =>
          self.clients.claim()
        )

    );

  }
);


/*
 * =========================================================
 * FETCH
 * =========================================================
 */

self.addEventListener(
  'fetch',
  event => {

    const request =
      event.request;


    if(
      request.method !== 'GET'
    ){
      return;
    }


    const url =
      new URL(
        request.url
      );


    /*
     * =====================================================
     * Supabase
     *
     * ข้อมูลต้องสดเสมอ
     * ไม่เก็บลง Cache Storage
     * =====================================================
     */

    if(
      url.hostname.endsWith(
        '.supabase.co'
      )
    ){
      return;
    }


    /*
     * =====================================================
     * Navigation
     *
     * Network First
     * เพื่อให้ index.html ใหม่ที่สุด
     * =====================================================
     */

    if(
      request.mode ===
      'navigate'
    ){

      event.respondWith(

        fetch(
          request,
          {
            cache: 'no-cache'
          }
        )

        .then(response => {

          if(
            response &&
            response.ok
          ){

            const copy =
              response.clone();


            caches
              .open(RUNTIME_CACHE)

              .then(cache =>
                cache.put(
                  request,
                  copy
                )
              );

          }


          return response;

        })

        .catch(async () => {

          const cached =
            await caches.match(
              request
            );


          if(cached){
            return cached;
          }


          const offline =
            await caches.match(
              './offline.html'
            );


          if(offline){
            return offline;
          }


          /*
           * ถ้า offline.html ไม่มีจริง
           * จะไม่ return undefined
           */

          return new Response(

            `
              <!doctype html>
              <html lang="th">
              <head>
                <meta charset="utf-8">
                <meta
                  name="viewport"
                  content="width=device-width,initial-scale=1"
                >
                <title>AdminPR</title>
              </head>

              <body
                style="
                  font-family:sans-serif;
                  padding:30px;
                "
              >

                <h2>
                  ไม่สามารถเชื่อมต่อระบบได้
                </h2>

                <p>
                  กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
                  แล้วลองใหม่อีกครั้ง
                </p>

              </body>
              </html>
            `,

            {
              headers:{
                'Content-Type':
                  'text/html; charset=utf-8'
              }
            }

          );

        })

      );


      return;

    }


    /*
     * =====================================================
     * ไฟล์ภายในเว็บไซต์
     *
     * Stale While Revalidate
     * =====================================================
     */

    if(
      url.origin ===
      self.location.origin
    ){

      event.respondWith(

        caches
          .match(request)

          .then(cached => {

            const networkFetch =

              fetch(request)

                .then(response => {

                  if(
                    response &&
                    response.ok
                  ){

                    const copy =
                      response.clone();


                    caches
                      .open(RUNTIME_CACHE)

                      .then(cache =>
                        cache.put(
                          request,
                          copy
                        )
                      );

                  }


                  return response;

                })

                .catch(() =>
                  cached
                );


            return (
              cached ||
              networkFetch
            );

          })

      );

    }

  }
);
