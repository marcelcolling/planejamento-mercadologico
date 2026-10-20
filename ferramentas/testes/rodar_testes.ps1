# Roda o teste de ponta a ponta do portal num Edge headless, contra um Apps Script simulado.
# Uso (PowerShell, na raiz do repositório):  .\ferramentas\testes\rodar_testes.ps1
# Não toca na planilha real. Saída: uma linha PASS/FAIL por verificação.
# O trabalho é feito por rodar_testes.py (Edge controlado pelo protocolo de depuração, em tempo real).
$env:PYTHONIOENCODING = "utf-8"
python "$PSScriptRoot\rodar_testes.py"
exit $LASTEXITCODE
