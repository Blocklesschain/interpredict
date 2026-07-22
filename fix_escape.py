with open('app/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = "localStorage.setItem(\\interpredict_dec_joined_\\, 'true')"
new = "localStorage.setItem(`interpredict_dec_joined_${walletAddress?.toLowerCase()}`, 'true')"
content = content.replace(old, new)

with open('app/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
