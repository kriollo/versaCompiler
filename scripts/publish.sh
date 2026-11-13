#!/usr/bin/env bash
# Publica versacompiler en npm con todas las comprobaciones previas.
#
# Uso:
#   pnpm release              # publica la versión de package.json
#   pnpm release --dry-run    # simula todo, no publica nada
#   pnpm release --otp 123456 # pasa el código 2FA directamente
#
# Si no hay sesión de npm, el script ofrece hacer `npm login` (navegador) y sigue.
#
# Flujo normal de una versión nueva:
#   1. Subir "version" en package.json y añadir la entrada en CHANGELOG.md
#   2. git commit -am "chore: versaCompiler X.Y.Z"
#   3. git tag -a vX.Y.Z -m "versaCompiler X.Y.Z: ..." && git push origin master vX.Y.Z
#   4. pnpm release
set -euo pipefail

cd "$(dirname "$0")/.."

DRY_RUN=false
OTP=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true ;;
        --otp) OTP="${2:?--otp necesita el código}"; shift ;;
        --otp=*) OTP="${1#--otp=}" ;;
        -h|--help) sed -n '2,/^set -euo/{/^set -euo/d;p}' "$0"; exit 0 ;;
        *) echo "Opción desconocida: $1" >&2; exit 1 ;;
    esac
    shift
done

red() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; }
green() { printf '\033[32m✔ %s\033[0m\n' "$*"; }
step() { printf '\n\033[36m▶ %s\033[0m\n' "$*"; }
fail() { red "$*"; exit 1; }

NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

step "Publicando $NAME@$VERSION$($DRY_RUN && echo ' (dry-run)')"

# --- Git -------------------------------------------------------------------
step "Comprobando git"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[[ "$BRANCH" == "master" ]] || fail "Estás en '$BRANCH'; publica desde master."
[[ -z "$(git status --porcelain)" ]] || fail "Hay cambios sin commitear (git status)."
git fetch --quiet origin master --tags
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/master)" ]] ||
    fail "master no coincide con origin/master: haz git pull / git push primero."
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null ||
    fail "No existe el tag $TAG. Créalo: git tag -a $TAG -m \"versaCompiler $VERSION\" && git push origin $TAG"
if [[ "$(git rev-list -n1 "$TAG")" != "$(git rev-parse HEAD)" ]]; then
    git merge-base --is-ancestor "$TAG" HEAD ||
        fail "El tag $TAG no está en la historia de master."
    # Commits posteriores al tag que no tocan lo publicado (scripts, docs) se toleran
    if ! git diff --quiet "$TAG" HEAD -- src tsconfig*.json README.md LICENSE; then
        fail "Hay cambios en src/ después de $TAG. Sube la versión y crea un tag nuevo."
    fi
    printf '\033[33m! Hay commits después de %s, pero no tocan src/: se publica igual.\033[0m\n' "$TAG"
fi
git ls-remote --exit-code --tags origin "$TAG" >/dev/null ||
    fail "El tag $TAG no está en GitHub: git push origin $TAG"
grep -q "^## \[$VERSION\]" CHANGELOG.md || fail "CHANGELOG.md no tiene la entrada ## [$VERSION]."
green "git OK (master, limpio, tag $TAG publicado)"

# --- npm -------------------------------------------------------------------
step "Comprobando npm"
if ! NPM_USER=$(npm whoami 2>/dev/null); then
    printf '\033[33m! No hay sesión en npm.\033[0m\n'
    read -r -p "¿Iniciar sesión ahora? Se abrirá el navegador para autenticar [S/n] " answer
    [[ "$answer" =~ ^[nN]$ ]] && fail "Sin sesión no se puede publicar. Inicia sesión con: npm login"
    # --auth-type=web: npm muestra una URL, autenticas en el navegador (con 2FA)
    # y la sesión queda guardada en ~/.npmrc para las próximas veces
    npm login --auth-type=web || fail "npm login falló."
    NPM_USER=$(npm whoami 2>/dev/null) || fail "Sigue sin haber sesión tras npm login."
fi
green "Sesión npm: $NPM_USER"
if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
    fail "$NAME@$VERSION ya está publicado en npm. Sube la versión en package.json."
fi
# Una versión con guion (2.9.0-beta.1) va al dist-tag "next", no a "latest"
DIST_TAG=latest
[[ "$VERSION" == *-* ]] && DIST_TAG=next
green "Se publicará con dist-tag '$DIST_TAG' (actual: $(npm view "$NAME" version 2>/dev/null || echo 'ninguna'))"

# --- Calidad ---------------------------------------------------------------
step "Lint, tests y build"
pnpm lint
pnpm test
pnpm build # prepublishOnly lo repite, pero así fallamos antes de pedir el OTP
pnpm audit --prod || fail "pnpm audit encontró vulnerabilidades en dependencias de producción."

step "Contenido del paquete"
npm pack --dry-run 2>&1 | grep -E 'npm notice (name|version|package size|unpacked size|total files)'

# --- Publicar --------------------------------------------------------------
PUBLISH_ARGS=(--access public --tag "$DIST_TAG" --no-git-checks)
[[ -n "$OTP" ]] && PUBLISH_ARGS+=(--otp "$OTP")

if $DRY_RUN; then
    step "Dry-run: pnpm publish ${PUBLISH_ARGS[*]} --dry-run"
    pnpm publish "${PUBLISH_ARGS[@]}" --dry-run
    green "Dry-run completo. Nada se publicó."
    exit 0
fi

read -r -p $'\n¿Publicar '"$NAME@$VERSION"' en npm? [s/N] ' answer
[[ "$answer" =~ ^[sSyY]$ ]] || fail "Cancelado."

# --no-git-checks: ya validamos rama/limpieza arriba con mensajes más claros
pnpm publish "${PUBLISH_ARGS[@]}"

green "Publicado: https://www.npmjs.com/package/$NAME/v/$VERSION"
echo "Crea el release en GitHub (opcional): gh release create $TAG --notes-from-tag"
