# Build automático no GitHub Actions

O workflow em `build.yml` gera os instaladores das três plataformas
(Windows, macOS, Linux) automaticamente.

## Como colocar no ar (passo a passo)

1. Crie um repositório no GitHub (pode ser privado).
2. No seu computador, dentro da pasta do projeto:
   ```
   git init
   git add .
   git commit -m "Primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/revya.git
   git push -u origin main
   ```
3. No GitHub, abra a aba **Actions**. O workflow já aparece.

## Como gerar os instaladores

**Opção A — testar agora (sem release):**
Aba Actions › "Build installers" › botão **Run workflow**. Ao terminar, os
instaladores ficam em **Artifacts**, no rodapé da execução.

**Opção B — lançar uma versão:**
```
git tag v0.1.0
git push origin v0.1.0
```
Isso dispara o build e cria um **Release** com os três instaladores anexados,
prontos para qualquer pessoa baixar.

## Sobre os APKs (importante)

Os APKs ficam no `.gitignore` e NÃO vão para o GitHub. Então os instaladores
gerados pelo Actions saem **sem os apps embutidos** por padrão. Para incluí-los,
escolha um caminho:

- **Mais simples:** remova as linhas `apks/**/*.apk` do `.gitignore`, comite os
  APKs junto, e o build os incluirá. Use só se o repositório for **privado** e
  você tiver o direito de redistribuir cada APK.
- **Mais correto para repo público:** suba os APKs como um "secret" ou use o
  GitHub Releases/armazenamento externo e adicione um passo no workflow para
  baixá-los antes do `npm run dist`. Posso montar esse passo quando você decidir.

O binário ADB (platform-tools) o próprio workflow já baixa do Google
automaticamente — esse não precisa de ação sua.

## Observação sobre o macOS

O `.dmg` só pode ser gerado em máquina macOS — por isso a matriz roda os três
sistemas em paralelo. Sem assinatura de código (code signing), o macOS vai
exibir um aviso de "desenvolvedor não identificado" na primeira execução; isso
é normal para apps não publicados na App Store e o usuário pode liberar nas
Preferências de Segurança. Assinatura exige conta paga de desenvolvedor Apple.
