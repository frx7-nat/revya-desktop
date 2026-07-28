# DexArmor Launcher — Plano de Desenvolvimento

Launcher de TV próprio para Android/Samsung DeX, integrado ao fluxo do DexArmor.
Objetivo: eliminar dependência de launchers de terceiros (licenças, remoção da loja, mudanças de comportamento fora do seu controle).

---

## 1. Principais dificuldades técnicas

### Leanback / TV Framework
Um launcher de TV precisa declarar `CATEGORY_LEANBACK_LAUNCHER` e implementar navegação 100% por D-pad — nada de toque. Isso exige foco explícito em cada elemento, `nextFocusUp/Down/Left/Right` bem definidos e estados visuais de foco claros. O problema mais comum é foco "perdido" em listas dinâmicas.

### Permissão QUERY_ALL_PACKAGES
Desde o Android 11, listar apps instalados exige essa permissão. Para uso próprio/sideload não há problema; na Play Store ela é restrita e exige justificativa — launcher é uma das poucas categorias aceitas.

### Substituir o launcher padrão em Samsung DeX
Ponto mais delicado. O DeX não é Android TV — é um ambiente desktop-like, e o intent `HOME` não se comporta da mesma forma. Opções realistas:

- Declarar `LAUNCHER` + `HOME` categories e deixar o usuário escolher como padrão
- Via ADB: `cmd package set-home-activity` (funciona sem root, alinhado ao que o DexArmor já faz)
- Bloquear a barra do DeX é limitado sem root

### Performance e memória
TVs e phones em modo DeX com HDMI têm orçamento apertado. Carregar ícones de 50+ apps sem cache trava a UI. Necessário cache em disco e carregamento lazy.

### Manter estado ao voltar
O launcher é destruído e recriado constantemente. Persistir posição de foco e ordem de apps é obrigatório.

### Reprodução de vídeo em background
Se quiser hero banners animados, atenção a wake locks e consumo de bateria.

---

## 2. Cronograma estimado

**MVP funcional: 2 a 3 semanas de trabalho real**, considerando tempo fragmentado entre fotografia e DexArmor.

### Semana 1 — base funcional
- Grid de apps
- Navegação D-pad
- Launch por intent
- Registro como HOME
- Setup do Android Studio, ajuste de foco nas bordas do grid, teste em DeX real via HDMI

O código de referência (seção 3) já cobre ~70% dessa etapa.

### Semana 2 — o que separa "roda" de "usável"
- Cache de ícones (sem isso trava com 40+ apps)
- Persistir estado ao voltar de um app
- Ocultar apps de sistema irrelevantes
- Relógio, status de rede, botão de configurações
- Tratamento de apps sem ícone leanback

### Semana 3 — integração DexArmor
- Comando ADB no fluxo do Electron
- Reversão limpa
- Assinatura do APK
- Teste em 2–3 modelos Galaxy diferentes

### O que estoura prazo, na prática
1. **Teste em DeX real.** Maior sorvedouro de tempo. Comportamentos que funcionam no emulador Android TV quebram no DeX porque não é o mesmo ambiente. Reserve tempo desproporcional.
2. **Bugs de foco.** `RecyclerView` + D-pad tem casos de borda chatos (última linha incompleta, scroll que perde o foco). Pode consumir 3–4 dias sozinho.

### Atalho para ~1 semana
Usar `androidx.leanback` com `VerticalGridSupportFragment` — resolve foco e scroll automaticamente. Perde-se flexibilidade visual (fica com cara de Android TV padrão, difícil aplicar a estética BMW M), mas ganha-se todo o tempo de volta.

**Recomendação:** começar com Leanback para validar o fluxo end-to-end com o DexArmor. Se funcionar e a identidade visual própria for prioridade, reescrever só a camada de UI depois, com a lógica já testada.

---

## 3. Código de referência (MVP mínimo)

### AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="tech.dexarmor.launcher">

    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />

    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

    <application
        android:label="DexArmor Launcher"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/tv_banner"
        android:theme="@style/Theme.DexArmor">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:stateNotNeeded="true"
            android:screenOrientation="landscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.LAUNCHER_APP" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### MainActivity.kt

```kotlin
package tech.dexarmor.launcher

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView

data class AppEntry(
    val label: String,
    val packageName: String,
    val icon: Drawable
)

class MainActivity : AppCompatActivity() {

    private lateinit var grid: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        grid = findViewById(R.id.app_grid)
        grid.layoutManager = GridLayoutManager(this, 5)
        grid.adapter = AppAdapter(loadApps()) { entry -> launch(entry.packageName) }
    }

    private fun loadApps(): List<AppEntry> {
        val pm = packageManager
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val leanback = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
        }

        val resolved = (pm.queryIntentActivities(leanback, 0) +
                        pm.queryIntentActivities(intent, 0))
            .distinctBy { it.activityInfo.packageName }
            .filter { it.activityInfo.packageName != packageName }

        return resolved.map {
            AppEntry(
                label = it.loadLabel(pm).toString(),
                packageName = it.activityInfo.packageName,
                icon = it.loadIcon(pm)
            )
        }.sortedBy { it.label.lowercase() }
    }

    private fun launch(pkg: String) {
        packageManager.getLaunchIntentForPackage(pkg)?.let { startActivity(it) }
    }

    // Impede que BACK saia do launcher
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) return true
        return super.onKeyDown(keyCode, event)
    }
}

class AppAdapter(
    private val items: List<AppEntry>,
    private val onClick: (AppEntry) -> Unit
) : RecyclerView.Adapter<AppAdapter.VH>() {

    class VH(v: View) : RecyclerView.ViewHolder(v) {
        val icon: ImageView = v.findViewById(R.id.item_icon)
        val label: TextView = v.findViewById(R.id.item_label)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_app, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val entry = items[position]
        holder.icon.setImageDrawable(entry.icon)
        holder.label.text = entry.label

        holder.itemView.isFocusable = true
        holder.itemView.isFocusableInTouchMode = true

        holder.itemView.setOnFocusChangeListener { v, hasFocus ->
            val scale = if (hasFocus) 1.15f else 1.0f
            v.animate().scaleX(scale).scaleY(scale).setDuration(150).start()
            v.elevation = if (hasFocus) 16f else 0f
        }

        holder.itemView.setOnClickListener { onClick(entry) }
    }

    override fun getItemCount() = items.size
}
```

### res/layout/item_app.xml

Estética BMW M — preto puro, âmbar `#F5A623`, zero border-radius.

```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="160dp"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="12dp"
    android:background="@drawable/focus_selector">

    <ImageView
        android:id="@+id/item_icon"
        android:layout_width="88dp"
        android:layout_height="88dp"
        android:scaleType="fitCenter" />

    <TextView
        android:id="@+id/item_label"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:gravity="center"
        android:maxLines="1"
        android:ellipsize="end"
        android:textColor="#FFFFFF"
        android:textSize="13sp" />
</LinearLayout>
```

### res/drawable/focus_selector.xml

```xml
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:state_focused="true">
        <shape android:shape="rectangle">
            <solid android:color="#1A1A1A" />
            <stroke android:width="2dp" android:color="#F5A623" />
        </shape>
    </item>
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#00000000" />
        </shape>
    </item>
</selector>
```

---

## 4. Definir como launcher padrão via ADB

Alinhado ao fluxo que o DexArmor já usa.

Aplicar:

```bash
adb shell cmd package set-home-activity tech.dexarmor.launcher/.MainActivity
```

Reverter:

```bash
adb shell cmd package set-home-activity com.sec.android.app.launcher/.activities.LauncherActivity
```

---

## 5. Considerações estratégicas

**Vantagens do launcher próprio:**
- Controle total sobre atualizações
- Sem exposição a mudanças de licença ou remoção da loja por terceiros
- Integração direta com o fluxo do DexArmor
- Identidade visual consistente com a marca

**Custo:**
- Manutenção contínua — cada versão do Android e cada One UI nova pode quebrar comportamento do DeX

**Alternativa intermediária:**
Distribuir o launcher próprio como padrão, mas manter a opção de o usuário escolher outro se preferir. Reduz a superfície de bugs no lançamento.
