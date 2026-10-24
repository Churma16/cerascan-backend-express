# Architectural Insight: Facade Pattern vs Factory Pattern

Dokumen ini mendokumentasikan wawasan arsitektur (*architectural insight*) dan rasionalisasi teknis di balik pemilihan pola desain (*design pattern*) pada backend CeraScan, khususnya perbandingan antara **Facade Pattern** dan **Factory Pattern**.

---

## 1. Ringkasan Perbedaan Konseptual

| Dimensi | Factory Pattern | Facade Pattern |
| :--- | :--- | :--- |
| **Fokus Utama** | **Object Creation**: Mengatur bagaimana sebuah objek diinstansiasi berdasarkan tipe atau varian tertentu. | **Interface Simplification**: Menyediakan satu gerbang antarmuka sederhana yang membungkus subsistem kompleks di baliknya. |
| **Waktu Keputusan (Decision Time)** | **Runtime / Dynamic Request**: Keputusan instansiasi umumnya dipicu oleh input dinamis pengguna atau payload transaksi. | **Boot-Time / Static Environment**: Keputusan routing umumnya ditentukan oleh konfigurasi lingkungan (`NODE_ENV`). |
| **Output ke Pemanggil** | Mengembalikan **instance objek** (`new KafkaPublisher()`, `new RabbitPublisher()`). | Tidak mengembalikan objek broker; langsung **mengeksekusi aksi** (`StreamPublisher.publishScanCompleted(payload)`). |
| **Tanggung Jawab Caller** | Pemanggil harus memanggil method objek tersebut dan menangani kegagalan koneksi secara manual. | Pemanggil terisolasi sepenuhnya dari detail broker dan mekanisme *fallback*. |

---

## 2. Studi Kasus 1: Message Broker Stream (Facade via `StreamPublisher`)

### Mengapa Pendekatan Lama (Factory) Dihapus?
Pada implementasi awal, sistem menggunakan `AnalyticsPublisherFactory` dengan beberapa berkas pendukung:
- `IAnalyticsPublisher.ts` (Interface)
- `KafkaStreamEventPublisher.ts` (Implementasi Kafka)
- `RabbitStreamEventPublisher.ts` (Implementasi RabbitMQ)
- `HiveMqAnalyticsPublisher.ts` (Implementasi MQTT)
- `AnalyticsPublisherFactory.ts` (Factory Class)

Pola tersebut dievaluasi sebagai *over-engineered* karena:
1. **Keputusan Statis per Environment**: Sistem hanya berganti broker berdasarkan konfigurasi *environment* (`development` menggunakan Kafka, `production` menggunakan RabbitMQ Streams). Setiap kali ada 1.000 scan bersamaan, broker yang digunakan tetap sama persis.
2. **Kebocoran Logika Error Handling**: Jika Kafka lokal mati, *caller* (seperti `AiScanSubscriber`) harus menangani `try-catch` dan memikirkan logika *fallback* sendiri.
3. **Boilerplate Berlebih**: Membutuhkan 5 berkas berbeda hanya untuk mengirim satu jenis event (`ceramic-scan-completed`).

### Solusi Sekarang: Facade Pattern (`StreamPublisher`)
Seluruh kompleksitas disatukan ke dalam satu kelas statis: `src/transport/stream/stream.publisher.ts`.

```text
[Caller / AiScanSubscriber]
            │
            ▼ (1 Baris Pemanggilan)
[StreamPublisher.publishScanCompleted(payload)]
            │
   ┌────────┴────────┐
   ▼                 ▼
[Production?]    [Development?]
   │                 │
   ▼                 ▼
RabbitMQ Streams   Kafka Topic
   │                 │
   └────────┬────────┘
            │ (Jika broker offline/gagal)
            ▼
    [In-Memory Fallback]
```

Keunggulan:
- **Clean Caller**: Pemanggil cukup memanggil `await StreamPublisher.publishScanCompleted(payload);`.
- **Built-in Resilience**: Jika broker tidak terhubung, `StreamPublisher` langsung mengeksekusi handler lokal (*fallback in-memory*) sehingga alur scan AI tidak pernah terhenti (*crash*).

---

## 3. Studi Kasus 2: Payment Gateway (Kasus Ideal untuk Factory Pattern)

Berbeda dengan Message Broker, modul **Payment Gateway** adalah contoh nyata di mana **Factory Pattern** sangat tepat untuk diterapkan.

### Mengapa Payment Gateway Memerlukan Factory?
1. **Keputusan Dinamis saat Runtime**: Provider pembayaran dipilih oleh pengguna saat transaksi berlangsung (misalnya: User A memilih QRIS via Midtrans, User B memilih Virtual Account via Xendit, User C memilih Kartu Kredit internasional via Stripe).
2. **State & Konfigurasi Berbeda per Provider**:
   - Midtrans memerlukan `serverKey`, `clientKey`, dan format payload Snap Token.
   - Xendit memerlukan `apiKey`, `webhookSecret`, dan callback URL tersendiri.
   - Stripe memerlukan `secretKey` dan mata uang dinamis (`usd`, `idr`).
3. **Open-Closed Principle**: Penambahan provider baru (misalnya PayPal) di masa depan cukup dilakukan dengan membuat class baru dan mendaftarkannya pada Factory, tanpa mengubah *controller* atau *use-case* pembayaran.

### Contoh Implementasi Ideal

```typescript
export interface IPaymentGateway {
    createInvoice(params: InvoiceParams): Promise<InvoiceResponse>;
    verifyWebhookSignature(headers: Record<string, any>, body: any): boolean;
}

export class PaymentGatewayFactory {
    static getGateway(provider: string): IPaymentGateway {
        switch (provider.toLowerCase()) {
            case "midtrans":
                return new MidtransGateway({
                    serverKey: process.env.MIDTRANS_SERVER_KEY!,
                    callbackUrl: process.env.MIDTRANS_CALLBACK_URL!
                });
            case "xendit":
                return new XenditGateway({
                    apiKey: process.env.XENDIT_API_KEY!,
                    webhookSecret: process.env.XENDIT_WEBHOOK_SECRET!
                });
            case "stripe":
                return new StripeGateway({
                    secretKey: process.env.STRIPE_SECRET_KEY!,
                    currency: "usd"
                });
            default:
                throw new Error(`Provider pembayaran '${provider}' tidak didukung`);
        }
    }
}
```

---

## 4. Matriks Pengambilan Keputusan

Gunakan panduan berikut saat merancang modul baru di masa mendatang:

```
Apakah pemilihan komponen bergantung pada input request/user saat runtime?
  ├── YA  ──> Gunakan FACTORY PATTERN
  │           (Contoh: Payment Gateway, Export Formatter [PDF/Excel/CSV], Notifier [Email/SMS/WA])
  │
  └── TIDAK (Statis berdasarkan environment atau konfigurasi boot server)
        └──> Apakah caller butuh berinteraksi langsung dengan objek instance?
              ├── YA  ──> Singleton / Dependency Injection Container
              └── TIDAK ──> Gunakan FACADE PATTERN
                            (Contoh: StreamPublisher, CacheManager, StorageFacade)
```
