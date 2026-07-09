// Gera o HTML da apresentação quinzenal de progresso
// com o design system Lavoura (Bebas Neue, cores, HUD, animações)

const LOGO_B64 = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDE5MjAgNTc1Ij4KICA8ZGVmcz4KICAgIDxzdHlsZT4KICAgICAgLmNscy0xIHsKICAgICAgICBmaWxsOiAjZjVmM2YwOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIGZpbGw6ICM1Y2I1ZTY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyOC43LjEsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiAxLjIuMCBCdWlsZCAxNDIpICAtLT4KICA8Zz4KICAgIDxnIGlkPSJMYXllcl8xIj4KICAgICAgPGc+CiAgICAgICAgPGc+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMDcuNiwxOC4zYzEyLjMsMCwyMS45LDMuNSwyOSwxMC40LDcuMSw2LjksMTAuNiwxNi41LDEwLjYsMjguOHYyNDAuOWMwLDQ2LDIyLjgsNjQuMSw2OC41LDY0LjFoOTcuMmMzLjgsMCw1LjcsNC4yLDUuNyw3LjZzLTEuOSw3LjYtNS43LDcuNmgtMTExYy0yMC43LDAtMzkuMy0yLjktNTUuOC04LjYtMTYuNS01LjgtMzAuNS0xNC00Mi0yNC43LTExLjUtMTAuNy0yMC4zLTIzLjYtMjYuNS0zOC41LTYuMS0xNS05LjItMzEuOC05LjItNTAuNlY1Ny40YzAtMTEuOSwzLjUtMjEuNCwxMC42LTI4LjUsNy4xLTcuMSwxNi42LTEwLjYsMjguNS0xMC42WiIvPgogICAgICAgICAgPGc+CiAgICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI2Ny43LDIzOS42YzAtMjEuMSwzLjUtNDAuNSwxMC42LTU4LjEsNy4xLTE3LjYsMTctMzIuOCwyOS42LTQ1LjQsMTIuNy0xMi43LDI3LjktMjIuNSw0NS43LTI5LjYsMTcuOC03LjEsMzcuMy0xMC42LDU4LjQtMTAuNiwyMC43LDAsMzkuNiwzLjUsNTYuNywxMC42LDE3LjEsNy4xLDMxLjYsMTcuMSw0My43LDI5LjksMTIuMSwxMi45LDIxLjQsMjguMywyNy45LDQ2LjMsNi41LDE4LDkuOCwzOCw5LjgsNTkuOHYxMDMuNWMwLDExLjEtMy40LDIwLTEwLjEsMjYuNy02LjcsNi43LTE1LjYsMTAuMS0yNi43LDEwLjEtMTEuMSwwLTE5LjktMy4yLTI2LjUtOS41LTYuNS02LjMtMTAuMi0xNC45LTEwLjktMjUuNi0xNi45LDIzLjgtNDAuOCwzNS43LTcxLjksMzUuNy0xOS4yLDAtMzctMy43LTUzLjUtMTEuMi0xNi41LTcuNS0zMC45LTE3LjYtNDMuMS0zMC41LTEyLjMtMTIuOC0yMi0yOC4xLTI5LjEtNDUuNy03LjEtMTcuNi0xMC42LTM2LjQtMTAuNi01Ni40Wk0zNDcuNywyMzkuNmMwLDQxLDUuOCw3My4zLDE3LjMsOTYuOSwxMS41LDIzLjYsMjcuMiwzMS42LDQ3LjIsMzEuNiwxOS42LDAsMzUuMS04LDQ2LjYtMzEuNiwxMS41LTIzLjYsMTcuMy01NS45LDE3LjMtOTYuOSwwLTQxLjQtNS43LTc0LTE3LjMtOTcuOC0xMS41LTIzLjgtMjcuMy0zMS43LTQ2LjktMzEuN3MtNDAsMTguNi00Ni42LDMxLjdjLTUuOCwxMS40LTkuOSwyNS41LTEyLjksNDItMy4xLDE2LjUtNC42LDM1LjEtNC42LDU1LjhaIi8+CiAgICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTY4MC4zLDM4My42Yy0yMS41LDAtMzguNy0xNy4xLTUxLjgtNTEuMmwtNzEuOS0xODguMWMtMi4zLTYuMS0zLTEyLjEtMi0xNy44LjktNS43LDMuMS0xMC44LDYuMy0xNS4yLDMuMy00LjQsNy43LTgsMTMuMi0xMC42LDUuNi0yLjcsMTEuOC00LDE4LjctNCwxNS43LDAsMjYuMyw3LjEsMzEuNiwyMS4zbDc2LjUsMjAyLjVjMy4xLDcuNyw1LjQsMTAuMSwxMCwxMC4xLDQuNiwwLDctMy44LDEwLTExLjVsODEuMS0yMTUuMWMuOC0xLjksMS45LTMuMiwzLjQtMy43LDEuNS0uNiwzLjYtLjcsNS45LjFzMy43LDIuMyw0LjUsMy42Yy44LDEuMy44LDMsMCw0LjlsLTg1LjcsMjIzLjhjLTEzLjQsMzQuMS0zMC4xLDUxLjItNTAuMSw1MS4yWiIvPgogICAgICAgICAgPC9nPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTI5Ny43LDM4My41Yy0xOS42LDAtMzcuNS0zLjMtNTMuOC05LjgtMTYuMy02LjUtMzAuMy0xNS42LTQyLTI3LjMtMTEuNy0xMS43LTIwLjgtMjUuOC0yNy4zLTQyLjMtNi41LTE2LjUtOS44LTM0LjUtOS44LTU0LjF2LTExNi44YzAtMTEuMSwzLjQtMjAsMTAuMS0yNi43LDYuNy02LjcsMTUuNi0xMC4xLDI2LjctMTAuMSwxMS4xLDAsMjAuMSwzLjQsMjcsMTAuMSw2LjksNi43LDEwLjQsMTUuNiwxMC40LDI2Ljd2MTU4LjJjMCwyNC41LDUuMyw0NC4zLDE1LjgsNTkuMywxMC41LDE1LDI0LjgsMTguMSw0Mi45LDE4LjEsMTcuNiwwLDMxLjgtMy4xLDQyLjYtMTguMSwxMC43LTE1LDE2LjEtMzQuNywxNi4xLTU5LjN2LTE1OC4yYy0uNC0xMS4xLDIuOS0yMCw5LjgtMjYuNyw2LjktNi43LDE1LjktMTAuMSwyNy0xMC4xLDExLjEsMCwyMC4xLDMuNCwyNywxMC4xLDYuOSw2LjcsMTAuNCwxNS42LDEwLjQsMjYuN3YxMTYuOGMwLDE5LjYtMy4zLDM3LjYtOS44LDU0LjEtNi41LDE2LjUtMTUuNiwzMC42LTI3LjMsNDIuMy0xMS43LDExLjctMjUuNywyMC44LTQyLDI3LjMtMTYuMyw2LjUtMzQuMiw5LjgtNTMuOCw5LjhaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNTAzLjYsMzgyLjljLTExLjEsMC0yMC0zLjQtMjYuNy0xMC4xLTYuNy02LjctMTAuMS0xNS42LTEwLjEtMjYuN3YtMTI2YzAtMTguOCwzLjItMzUuOSw5LjgtNTEuMiw2LjUtMTUuMywxNS44LTI4LjQsMjcuOS0zOS4xLDEyLjEtMTAuNywyNi42LTE5LjEsNDMuNC0yNSwxNi45LTUuOSwzNS44LTguOSw1Ni45LTguOWgyLjljMy44LDAsNS43LDMuNyw1LjcsNy4yLDAsMy41LTEuOSw3LjItNS43LDcuMmgtMi45Yy0xOS41LDAtMzUuMSw3LjEtNDYuNiwyMS4zLTExLjUsMTQuMi0xNy4zLDI5LjItMTcuMyw1M3YxNjEuNmMwLDExLjEtMy41LDIwLTEwLjQsMjYuNy02LjksNi43LTE1LjksMTAuMS0yNywxMC4xWiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTU4NS4xLDIzOS42YzAtMjEuMSwzLjUtNDAuNSwxMC42LTU4LjEsNy4xLTE3LjYsMTctMzIuOCwyOS42LTQ1LjQsMTIuNy0xMi43LDI3LjktMjIuNSw0NS43LTI5LjYsMTcuOC03LjEsMzcuMy0xMC42LDU4LjQtMTAuNiwyMC43LDAsMzkuNiwzLjUsNTYuNywxMC42LDE3LjEsNy4xLDMxLjYsMTcuMSw0My43LDI5LjksMTIuMSwxMi45LDIxLjQsMjguMywyNy45LDQ2LjMsNi41LDE4LDkuOCwzOCw5LjgsNTkuOHYxMDMuNWMwLDExLjEtMy40LDIwLTEwLjEsMjYuNy02LjcsNi43LTE1LjYsMTAuMS0yNi43LDEwLjEtMTEuMSwwLTE5LjktMy4yLTI2LjUtOS41LTYuNS02LjMtMTAuMi0xNC45LTEwLjktMjUuNi0xNi45LDIzLjgtNDAuOCwzNS43LTcxLjksMzUuNy0xOS4yLDAtMzctMy43LTUzLjUtMTEuMi0xNi41LTcuNS0zMC45LTE3LjYtNDMuMS0zMC41LTEyLjMtMTIuOC0yMi0yOC4xLTI5LjEtNDUuNy03LjEtMTcuNi0xMC42LTM2LjQtMTAuNi01Ni40Wk0xNjY1LDIzOS42YzAsNDEsNS44LDczLjMsMTcuMyw5Ni45LDExLjUsMjMuNiwyNy4yLDMxLjYsNDcuMiwzMS42LDE5LjYsMCwzNS4xLTgsNDYuNi0zMS42LDExLjUtMjMuNiwxNy4zLTU1LjksMTcuMy05Ni45LDAtNDEuNC01LjctNzQtMTcuMy05Ny44LTExLjUtMjMuOC0yNy4zLTMxLjctNDYuOS0zMS43cy00MCwxOC42LTQ2LjYsMzEuN2MtNS44LDExLjQtOS45LDI1LjUtMTIuOSw0Mi0zLjEsMTYuNS00LjYsMzUuMS00LjYsNTUuOFoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPGc+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yOTMuMyw0ODAuMXY0NS41aDI5Ljh2MTAuNmgtNDEuOXYtNTYuMWgxMi4xWiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzYyLjMsNDgwLjFsMjQuMyw1Ni4xaC0xMy4ybC01LjctMTNoLTIzLjRsLTUuNiwxM2gtMTMuMmwyNC4zLTU2LjFoMTIuNVpNMzQ3LjUsNTE0LjRoMTcuMWwtMy41LTguMWMtMS42LTMuNS00LjctMTMuNi00LjctMTMuNmgtLjRzLTMuNCwxMC4xLTQuOCwxMy42bC0zLjUsOC4xWiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzgzLjcsNDgwLjFoMTMuNWwxMi44LDI5LjljMS4xLDIuOCwzLjMsMTAuNCwzLjMsMTAuNGguNXMyLjItNy42LDMuMy0xMC40bDEyLjctMjkuOWgxMy42bC0yMy44LDU2LjFoLTEyLjFsLTIzLjgtNTYuMVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTQ3Ny4yLDQ4MC4xbDI0LjMsNTYuMWgtMTMuMmwtNS43LTEzaC0yMy40bC01LjYsMTNoLTEzLjJsMjQuMy01Ni4xaDEyLjVaTTQ2Mi40LDUxNC40aDE3LjFsLTMuNS04LjFjLTEuNi0zLjUtNC43LTEzLjYtNC43LTEzLjZoLS40cy0zLjQsMTAuMS00LjgsMTMuNmwtMy41LDguMVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU1MC43LDQ4MC4xaDEyLjF2NTYuMWgtMTEuM2wtMzEtMzcuNWgtLjJzLjgsOC42LjgsMTIuOXYyNC42aC0xMi4xdi01Ni4xaDExLjVsMzAuOSwzNy4zaC4ycy0uOC04LjctLjgtMTEuOXYtMjUuNFoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTU5NC4zLDQ4MC4xYzI0LjksMCwzNC4xLDEyLjIsMzQuMSwyOHMtMTEsMjguMS0zMC43LDI4LjFoLTIxLjR2LTU2LjFoMTcuOVpNNTg4LjUsNTI1LjZoOS41YzEyLjUsMCwxOC40LTUuMywxOC40LTE3LjZzLTUuMS0xNy40LTIwLjEtMTcuNGgtNy44djM1WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNjUwLjMsNTEyLjJ2MTMuNmgzMnYxMC40aC00NHYtNTYuMWg0Mi41djEwLjVoLTMwLjR2MTIuNGgyNi44djkuMmgtMjYuOFoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTY5MS41LDQ4MC4xaDIxLjZjMTUuNywwLDIyLjcsNy43LDIyLjcsMTguMnMtMi43LDEyLjMtOS4xLDE1LjN2LjNsMTQsMjIuM2gtMTMuNWwtMTIuOS0yMC4zaC0xMC42djIwLjNoLTEyLjF2LTU2LjFaTTcxMi4yLDUwNi45YzguMSwwLDExLjUtMi41LDExLjUtOC40cy0yLjQtOC4yLTEwLjktOC4yaC05LjR2MTYuNWg4LjdaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik03NjAuMiw0ODAuMXY1Ni4xaC0xMi4xdi01Ni4xaDEyLjFaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik04MDQuNSw0ODAuMWwyNC4zLDU2LjFoLTEzLjJsLTUuNy0xM2gtMjMuNGwtNS42LDEzaC0xMy4ybDI0LjMtNTYuMWgxMi41Wk03ODkuNiw1MTQuNGgxNy4xbC0zLjUtOC4xYy0xLjYtMy41LTQuNy0xMy42LTQuNy0xMy42aC0uNHMtMy40LDEwLjEtNC44LDEzLjZsLTMuNSw4LjFaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik04NzQuOSw0ODAuMWMyNC45LDAsMzQuMSwxMi4yLDM0LjEsMjhzLTExLDI4LjEtMzAuNywyOC4xaC0yMS40di01Ni4xaDE3LjlaTTg2OSw1MjUuNmg5LjVjMTIuNSwwLDE4LjQtNS4zLDE4LjQtMTcuNnMtNS4xLTE3LjQtMjAuMS0xNy40aC03Ljh2MzVaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik05MzAuOCw1MTIuMnYxMy42aDMydjEwLjRoLTQ0di01Ni4xaDQyLjV2MTAuNWgtMzAuNHYxMi40aDI2Ljh2OS4yaC0yNi44WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTAyMy40LDQ4MC4xbDI0LjMsNTYuMWgtMTMuMmwtNS43LTEzaC0yMy40bC01LjYsMTNoLTEzLjJsMjQuMy01Ni4xaDEyLjVaTTEwMDguNiw1MTQuNGgxNy4xbC0zLjUtOC4xYy0xLjYtMy41LTQuNy0xMy42LTQuNy0xMy42aC0uNHMtMy40LDEwLjEtNC44LDEzLjZsLTMuNSw4LjFaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMTA1LjgsNDgwLjF2MzMuOWMwLDE1LjktMTEuOSwyMy4zLTI2LjMsMjMuM3MtMjYuNC03LjQtMjYuNC0yMy4zdi0zMy45aDEyLjF2MzMuNGMwLDguMSw0LjcsMTMuMSwxNC4zLDEzLjFzMTQuMi01LDE0LjItMTMuMXYtMzMuNGgxMi4xWiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTEzNCw0OTAuN2gtMjAuOXYtMTAuNmg1My44djEwLjZoLTIwLjl2NDUuNWgtMTIuMXYtNDUuNVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEyMzIuMyw1MDcuOGMwLDE2LjktMTIuNCwyOS40LTMwLjksMjkuNHMtMzAuOS0xMS43LTMwLjktMjkuNCwxMy4zLTI4LjcsMzAuOS0yOC43LDMwLjksMTIuNCwzMC45LDI4LjdaTTExODMuMyw1MDcuOWMwLDExLjksNy44LDE4LjUsMTguMSwxOC41czE4LjEtNi43LDE4LjEtMTguNS03LjgtMTgtMTguMS0xOC0xOC4xLDcuMi0xOC4xLDE4WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTIzOC43LDUzMi43bDIuNi05LjhjNC41LDIsMTEuNyw0LjMsMTguNyw0LjNzMTIuNi0zLjYsMTIuNi04LjEtMS0zLjgtMy00LjljLTItMS02LjItMS43LTExLjItMi4zLTUuNi0uNi0xMC0xLjYtMTMuNC0zLjUtNS4xLTIuOC03LTcuNi03LTEyLjQsMC05LjksOS4yLTE3LjEsMjIuOS0xNy4xczE0LjgsMS42LDIwLjEsNGwtMi44LDkuNWMtNC4xLTEuNy0xMC45LTMuNC0xNy0zLjQtOC41LDAtMTEuMiwzLjYtMTEuMiw3cy43LDMuNSwzLjEsNC43YzIuMywxLDYsMS41LDEwLjksMi4xLDUuMy43LDEwLjEsMS43LDEzLjEsMy40LDQuOSwyLjcsNy4yLDcuMSw3LjIsMTIuNywwLDEwLjItNy45LDE4LjItMjMuNCwxOC4ycy0xNi41LTEuNy0yMi4yLTQuNVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTEyOTAuOCw1MzIuN2wyLjYtOS44YzQuNSwyLDExLjcsNC4zLDE4LjcsNC4zczEyLjYtMy42LDEyLjYtOC4xLTEtMy44LTMtNC45Yy0yLTEtNi4yLTEuNy0xMS4yLTIuMy01LjYtLjYtMTAtMS42LTEzLjQtMy41LTUuMS0yLjgtNy03LjYtNy0xMi40LDAtOS45LDkuMi0xNy4xLDIyLjktMTcuMXMxNC44LDEuNiwyMC4xLDRsLTIuOCw5LjVjLTQuMS0xLjctMTAuOS0zLjQtMTctMy40cy0xMS4yLDMuNi0xMS4yLDcsLjcsMy41LDMuMSw0LjdjMi4zLDEsNiwxLjUsMTAuOSwyLjEsNS4zLjcsMTAuMSwxLjcsMTMuMSwzLjQsNC45LDIuNyw3LjIsNy4xLDcuMiwxMi43LDAsMTAuMi03LjksMTguMi0yMy40LDE4LjJzLTE2LjUtMS43LTIyLjItNC41WiIvPgogICAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTM1OC4zLDUxMi4ydjEzLjZoMzJ2MTAuNGgtNDR2LTU2LjFoNDIuNXYxMC41aC0zMC40djEyLjRoMjYuOHY5LjJoLTI2LjhaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMzk5LjUsNDgwLjFoMjEuNmMxNS43LDAsMjIuNyw3LjcsMjIuNywxOC4ycy0yLjcsMTIuMy05LjEsMTUuM3YuM2wxNCwyMi4zaC0xMy41bC0xMi45LTIwLjNoLTEwLjZ2MjAuM2gtMTIuMXYtNTYuMVpNMTQyMC4zLDUwNi45YzguMSwwLDExLjYtMi41LDExLjYtOC40cy0yLjQtOC4yLTEwLjktOC4yaC05LjR2MTYuNWg4LjdaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNDQ5LjIsNDgwLjFoMTMuNWwxMi44LDI5LjljMS4xLDIuOCwzLjMsMTAuNCwzLjMsMTAuNGguNXMyLjItNy42LDMuMy0xMC40bDEyLjctMjkuOWgxMy42bC0yMy44LDU2LjFoLTEyLjFsLTIzLjgtNTYuMVoiLz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE1MjguNCw0ODAuMXY1Ni4xaC0xMi4xdi01Ni4xaDEyLjFaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNTU3LjgsNTQ5LjRzMy40LjksNy4yLjksNS4xLS44LDUuMS0yLjYtLjktMi4zLTQuMy0yLjMtNC43LjMtNC43LjNsMi44LTguOGMtMTguMS0xLjctMjYuNS0xNC4xLTI2LjUtMjguM3MxMi40LTI5LjYsMzEtMjkuNiwxNy44LDQuMiwyMS44LDcuM2wtNC43LDkuNWMtNC42LTMuOC05LjktNi4yLTE2LjYtNi4yLTExLjgsMC0xOC45LDguNC0xOC45LDE4LjlzNy4xLDE4LjEsMTkuNCwxOC4xLDE0LjItNC4zLDE3LjktNy42bDQuNyw4LjdjLTIuOSwzLjItMTAsOC43LTIxLjMsOS40bC0xLjQsNC41aDBjLjktLjcsMi0uOSwyLjgtLjksNCwwLDYuOCwyLjcsNi44LDdzLTIuNyw4LjktMTMsOC45LTguMi0xLTguMi0xdi02LjJaIi8+CiAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xNjU4LjgsNTA3LjhjMCwxNi45LTEyLjQsMjkuNC0zMC45LDI5LjRzLTMwLjktMTEuNy0zMC45LTI5LjQsMTMuMy0yOC43LDMwLjktMjguNywzMC45LDEyLjQsMzAuOSwyOC43Wk0xNjA5LjgsNTA3LjljMCwxMS45LDcuOCwxOC41LDE4LjEsMTguNXMxOC4xLTYuNywxOC4xLTE4LjUtNy44LTE4LTE4LjEtMTgtMTguMSw3LjItMTguMSwxOFoiLz4KICAgICAgICA8L2c+CiAgICAgICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTExNC41LDE3My41Yy03LjktMTkuNi0xOC44LTM2LjQtMzIuOS01MC41LTE0LjEtMTQuMS0zMC45LTI1LTUwLjUtMzIuOS0xOS42LTcuOS00MS4xLTExLjgtNjQuNS0xMS44cy00NSwzLjktNjQuOCwxMS44Yy0xOS44LDcuOS0zNi43LDE4LjgtNTAuOCwzMi45LTE0LjEsMTQuMS0yNSwzMC45LTMyLjksNTAuNS03LjksMTkuNi0xMS44LDQxLjEtMTEuOCw2NC41czMuOSw0NC45LDExLjgsNjQuNWM3LjksMTkuNiwxOC44LDM2LjQsMzIuOSw1MC41LDE0LjEsMTQuMSwzMSwyNSw1MC44LDMyLjksMTkuOCw3LjksNDEuNCwxMS44LDY0LjgsMTEuOHM0NC45LTMuOSw2NC41LTExLjhjMTkuNi03LjksMzYuNC0xOC44LDUwLjUtMzIuOSwxNC4xLTE0LjEsMjUtMzAuOSwzMi45LTUwLjUsNy45LTE5LjYsMTEuOC00MS4xLDExLjgtNjQuNXMtMy45LTQ0LjktMTEuOC02NC41Wk0xMDk0LjMsMjkzLjhjLTYuOCwxNi45LTE2LjIsMzEuNC0yOC40LDQzLjUtMTIuMSwxMi4xLTI2LjYsMjEuNi00My41LDI4LjQtMTYuOSw2LjgtMzUuNiwxMC4yLTU1LjgsMTAuMnMtMzguOS0zLjQtNTYtMTAuMmMtMTcuMS02LjgtMzEuNy0xNi4zLTQzLjktMjguNC0xMi4xLTEyLjEtMjEuNi0yNi42LTI4LjQtNDMuNS02LjgtMTYuOS0xMC4yLTM1LjYtMTAuMi01NS44czMuNC0zOC44LDEwLjItNTUuN2M2LjgtMTYuOSwxNi4zLTMxLjUsMjguNC00My42LDEyLjEtMTIuMSwyNi43LTIxLjYsNDMuOS0yOC40LDE3LjEtNi44LDM1LjgtMTAuMiw1Ni0xMC4yczM4LjksMy40LDU1LjgsMTAuMmMxNi45LDYuOCwzMS40LDE2LjMsNDMuNSwyOC40LDEyLjIsMTIuMSwyMS42LDI2LjcsMjguNCw0My42LDYuOCwxNi45LDEwLjIsMzUuNSwxMC4yLDU1LjdzLTMuNCwzOC45LTEwLjIsNTUuOFoiLz4KICAgICAgICA8Zz4KICAgICAgICAgIDxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTg0MS4yLDIzOGMwLTE4LjMsMy4xLTM1LjEsOS4yLTUwLjUsNi4yLTE1LjMsMTQuNy0yOC41LDI1LjctMzkuNSwxMS0xMSwyNC4yLTE5LjYsMzkuNy0yNS43LDE1LjUtNi4yLDMyLjQtOS4yLDUwLjctOS4yczM1LjEsMy4xLDUwLjUsOS4yYzE1LjMsNi4yLDI4LjUsMTQuNywzOS41LDI1LjcsMTEsMTEsMTkuNiwyNC4yLDI1LjcsMzkuNSw2LjIsMTUuMyw5LjIsMzIuMSw5LjIsNTAuNXMtMy4xLDM1LjEtOS4yLDUwLjVjLTYuMiwxNS4zLTE0LjcsMjguNS0yNS43LDM5LjUtMTEsMTEtMjQuMSwxOS42LTM5LjUsMjUuNy0xNS4zLDYuMi0zMi4xLDkuMi01MC41LDkuMnMtMzUuMi0zLjEtNTAuNy05LjJjLTE1LjUtNi4yLTI4LjctMTQuNy0zOS43LTI1LjctMTEtMTEtMTkuNi0yNC4xLTI1LjctMzkuNS02LjItMTUuMy05LjItMzIuMS05LjItNTAuNVoiLz4KICAgICAgICAgIDxnPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMDg2LDIzOC4zYzAsMTcuNC0yLjksMzMuMi04LjcsNDcuNy01LjcsMTQuNS0xMy44LDI2LjktMjQuMywzNy40LTEwLjQsMTAuMy0yMi45LDE4LjUtMzcuNCwyNC4zLTcsMi45LTE0LjUsNS0yMi4zLDYuNS0uNC4xLS45LjItMS40LjItMS43LjMtMy40LjUtNS4xLjktNi4xLjctMTIuMiwxLjItMTguNiwxLjJzLTEzLjEtLjQtMTkuMy0xLjJjLTQtLjYtOC4xLTEuNC0xMS45LTIuMi02LTEuNC0xMS43LTMuMi0xNy4yLTUuNC0zLjYtMS40LTctMy0xMC40LTQuNy00LjItMi4xLTguMS00LjUtMTEuOC03LjEtMS0uNS0xLjktMS4yLTIuOS0xLjktLjYtLjQtMS4yLS45LTEuNy0xLjItMi0xLjUtMy45LTMtNS43LTQuNy0xLjYtMS41LTMuMi0zLTQuOC00LjYtMTAuNC0xMC40LTE4LjUtMjIuOS0yNC40LTM3LjQtMi44LTYuOS00LjgtMTQuMS02LjMtMjEuNiwxMC42LDMuMSwyNC44LDUuNSw2MC4zLTEwLjksMzMuMi0xNS40LDczLjYtLjksODEuOCwxLjUsMTMuMiwzLjksMzEuOCwxMS41LDU1LjcuNSwxNi44LTcuNywyOS4zLTIwLjMsMzYuMS0yOC42LjMsMy43LjQsNy42LjQsMTEuNFoiLz4KICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz0iY2xzLTEiIGN4PSI4ODguMiIgY3k9IjIxNC45IiByPSIzMiIvPgogICAgICAgICAgICA8Y2lyY2xlIGNsYXNzPSJjbHMtMSIgY3g9IjkyNy42IiBjeT0iMTU1LjYiIHI9IjE5LjgiLz4KICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz0iY2xzLTEiIGN4PSI5NTQuNyIgY3k9IjE5Ni41IiByPSIxMi4yIi8+CiAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgICA8L2c+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4=";

const ETAPA_EMOJIS: Record<number, string> = {
  1: "🌱", 2: "🌿", 3: "🪴", 4: "🔨", 5: "🌸", 6: "🎉", 7: "🌾",
};

const WEEK_ICONS = ["📋","📄","🔧","🏷️","📦","☕","🧴","🧹","📊","📷"];

const CTA_LINES: Record<number, [string, string]> = {
  1: ["A SEMENTE", "FOI ESCOLHIDA"],
  2: ["O SOLO ESTÁ", "PREPARADO"],
  3: ["O PLANTIO", "COMEÇOU"],
  4: ["A LAVOURA", "MATURA"],
  5: ["A LAVOURA", "FLORESCEU"],
  6: ["HORA DA", "COLHEITA"],
  7: ["CUIDANDO", "DA LAVOURA"],
};

export type ApresentacaoData = {
  unidadeNumero: string;
  unidadeNome: string | null;
  dataReuniao: string;
  etapaAtualNumero: number;
  etapaAtualNome: string;
  proximaEtapaNome: string | null;
  pctGeral: number;
  totalConcluidos: number;
  totalSubitens: number;
  etapas: Array<{
    numero: number;
    nome: string;
    pct: number;
    concluidos: number;
    total: number;
    status: "done" | "current" | "next";
  }>;
  feito: string[];       // concluídos nos últimos 15 dias
  semana: string[];      // próximos pendentes da etapa atual (até 5)
  proximaSemana: string[]; // pendentes seguintes (até 4)
};

export function gerarApresentacaoHTML(d: ApresentacaoData): string {
  const dataFmt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const ringOffset = Math.round(314 - (d.pctGeral / 100) * 314);
  const [ctaL1, ctaL2] = CTA_LINES[d.etapaAtualNumero] ?? ["AVANÇANDO", "NA JORNADA"];

  const etapasList = d.etapas.map(e => {
    const dotClass = e.status === "done" ? "edone" : e.status === "current" ? "ecurrent" : "enext";
    const nomeClass = e.status === "current" ? ' class="etapa-nome active"' : ' class="etapa-nome"';
    const pctClass = e.status === "current" ? ' class="etapa-pct active"' : ' class="etapa-pct"';
    const sufixo = e.status === "current" ? " ← Você está aqui" : "";
    return `<div class="etapa-row"><div class="etapa-dot ${dotClass}"></div><span${nomeClass}>${ETAPA_EMOJIS[e.numero]} ${e.nome}${sufixo}</span><span${pctClass}>${e.pct}%</span></div>`;
  }).join("");

  const feitoCards = d.feito.map((t, i) =>
    `<div class="check-card el d${3 + Math.floor(i/2)}"><div class="chk">✓</div><span class="check-lbl">${t}</span></div>`
  ).join("");

  const semanaCards = d.semana.map((t, i) =>
    `<div class="week-card el d${3+i}"><span class="week-n">0${i+1}</span><div class="week-ico">${WEEK_ICONS[i]}</div><span class="week-txt">${t}</span></div>`
  ).join("");

  const proximaCards = d.proximaSemana.map((t, i) =>
    `<div class="week-card el d${3+i}"><span class="week-n">0${i+1}</span><div class="week-ico">${WEEK_ICONS[i+4]}</div><span class="week-txt">${t}</span></div>`
  ).join("");

  const nextItems = [
    `Concluir Etapa ${d.etapaAtualNumero} — ${d.etapaAtualNome}`,
    d.proximaEtapaNome ? `Em seguida: ${ETAPA_EMOJIS[d.etapaAtualNumero+1]} ${d.proximaEtapaNome}` : null,
  ].filter(Boolean).map(t => `<div class="next-item"><div class="next-dot"></div>${t}</div>`).join("");

  const progressFill = `@keyframes fillBar { to{width:${d.pctGeral}%} }`;
  const ringFill = `@keyframes fillRing { to{stroke-dashoffset:${ringOffset}} }`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>Reunião Quinzenal — ${d.unidadeNumero} | Lavoura</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">
<style>
:root{--verde:#394f3e;--laranja:#e17c4c;--off-white:#fdfdfd;--verde-escuro:#243429;--verde-deep:#1a2820;--verde-mid:#1e2e22;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Lato',sans-serif;background:var(--verde-deep);color:var(--off-white);-webkit-font-smoothing:antialiased;}
#deck{position:fixed;inset:0;overflow:hidden;}
.slide{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:80px 10vw;overflow:hidden;transform:translateX(100%);visibility:hidden;pointer-events:none;}
.slide.is-active{transform:translateX(0);visibility:visible;pointer-events:auto;}
.slide.is-leaving{transform:translateX(-8%);visibility:visible;opacity:0;pointer-events:none;transition:transform 0.65s cubic-bezier(0.77,0,0.18,1),opacity 0.65s ease;}
.el{opacity:0;transform:translateY(24px);}
.slide.is-active .el{animation:elIn 0.55s ease forwards;}
.d0{animation-delay:0.10s!important}.d1{animation-delay:0.22s!important}.d2{animation-delay:0.34s!important}.d3{animation-delay:0.46s!important}.d4{animation-delay:0.58s!important}.d5{animation-delay:0.70s!important}.d6{animation-delay:0.82s!important}.d7{animation-delay:0.94s!important}
@keyframes elIn{to{opacity:1;transform:translateY(0);}}
#slide-1{background:var(--verde-escuro);padding:0;align-items:stretch;}
#slide-2{background:var(--verde);justify-content:center;padding-top:72px;}
#slide-3{background:var(--verde-escuro);}
#slide-4{background:var(--verde-mid);}
#slide-5{background:var(--verde);}
#slide-6{background:var(--verde-deep);align-items:center;text-align:center;}
#hud{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:16px 48px;background:rgba(26,40,32,0.88);backdrop-filter:blur(14px);border-bottom:1px solid rgba(225,124,76,0.14);}
.hud-right{display:flex;align-items:center;gap:18px;}
.hud-badge{font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:2px;color:var(--laranja);border:1px solid var(--laranja);padding:4px 10px;border-radius:2px;}
.hud-counter{font-size:11px;letter-spacing:2px;color:rgba(253,253,253,0.35);font-weight:700;}
#prog-bar{position:fixed;top:0;left:0;height:3px;background:var(--laranja);z-index:300;transition:width 0.4s ease;box-shadow:0 0 10px rgba(225,124,76,0.5);}
#nav-controls{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;gap:14px;}
.nav-btn{width:42px;height:42px;border-radius:50%;border:1px solid rgba(253,253,253,0.2);background:rgba(26,40,32,0.75);backdrop-filter:blur(10px);color:var(--off-white);font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;user-select:none;}
.nav-btn:hover{border-color:var(--laranja);background:rgba(225,124,76,0.15);color:var(--laranja);}
.nav-btn:disabled{opacity:0.25;cursor:default;}
.nav-dots{display:flex;gap:7px;align-items:center;}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(253,253,253,0.25);cursor:pointer;transition:all 0.3s ease;}
.dot.active{background:var(--laranja);width:20px;border-radius:3px;box-shadow:0 0 8px rgba(225,124,76,0.5);}
#key-hint{position:fixed;bottom:28px;right:48px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(253,253,253,0.18);pointer-events:none;}
.deco-circle{position:absolute;border-radius:50%;border:1px solid rgba(225,124,76,0.1);pointer-events:none;}
.grain{position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");pointer-events:none;opacity:0.5;}
@keyframes rotateSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.eyebrow{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:var(--laranja);font-weight:700;}
.eyebrow::before{content:'';display:block;width:22px;height:2px;background:var(--laranja);flex-shrink:0;}
.stitle{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5.5vw,68px);letter-spacing:3px;line-height:0.95;color:var(--off-white);margin:10px 0 24px;}
.tag{display:inline-flex;align-items:center;gap:6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;padding:4px 10px;border-radius:2px;}
.tag-done{background:rgba(225,124,76,0.15);color:var(--laranja);border:1px solid rgba(225,124,76,0.3);}
.tag-current{background:rgba(253,253,253,0.1);color:var(--off-white);border:1px solid rgba(253,253,253,0.2);}
.tag-next{background:rgba(90,122,98,0.2);color:#7dab86;border:1px solid rgba(90,122,98,0.4);}
.hero-wrap{position:relative;display:flex;align-items:center;width:100%;height:100%;}
.hero-bg-grad{position:absolute;inset:0;background:radial-gradient(ellipse 65% 55% at 68% 50%,rgba(57,79,62,0.65) 0%,transparent 70%),radial-gradient(circle 280px at 15% 85%,rgba(225,124,76,0.07) 0%,transparent 70%);}
.hero-content{position:relative;z-index:2;padding:0 10vw;max-width:680px;}
.hero-eyebrow{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:var(--laranja);font-weight:700;margin-bottom:16px;}
.hero-eyebrow::before{content:'';display:block;width:22px;height:2px;background:var(--laranja);}
.hero-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,8vw,96px);line-height:0.9;letter-spacing:2px;margin-bottom:20px;}
.hero-title .accent{color:var(--laranja);}
.hero-divider{width:0;height:3px;background:var(--laranja);margin-bottom:24px;}
.slide.is-active .hero-divider{animation:growLine 0.6s 0.9s ease forwards;}
@keyframes growLine{to{width:64px}}
.hero-meta{display:flex;gap:20px;}
.hero-meta-item{display:flex;flex-direction:column;gap:2px;}
.hero-meta-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(253,253,253,0.35);font-weight:700;}
.hero-meta-value{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--off-white);letter-spacing:1px;}
.hero-visual{position:absolute;right:0;top:0;bottom:0;width:45%;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.hero-big-num{font-family:'Bebas Neue',sans-serif;font-size:min(36vw,380px);color:rgba(255,255,255,0.025);letter-spacing:-16px;user-select:none;line-height:1;}
.geral-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;width:100%;max-width:1060px;margin-top:20px;}
.kpi-card{padding:20px 22px;background:rgba(253,253,253,0.04);border:1px solid rgba(253,253,253,0.07);border-left:3px solid var(--laranja);}
.kpi-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(253,253,253,0.4);font-weight:700;margin-bottom:6px;}
.kpi-value{font-family:'Bebas Neue',sans-serif;font-size:clamp(24px,3.5vw,42px);color:var(--laranja);line-height:1;}
.kpi-sub{font-size:11px;color:rgba(253,253,253,0.45);margin-top:4px;}
.etapas-list{display:flex;flex-direction:column;gap:4px;margin-top:16px;width:100%;max-width:1060px;}
.etapa-row{display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid rgba(253,253,253,0.05);}
.etapa-row:last-child{border-bottom:none;}
.etapa-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.edone{background:var(--laranja);}
.ecurrent{background:var(--off-white);box-shadow:0 0 8px rgba(253,253,253,0.5);}
.enext{background:rgba(253,253,253,0.15);}
.etapa-nome{font-size:12px;color:rgba(253,253,253,0.7);flex:1;}
.etapa-nome.active{color:var(--off-white);font-weight:700;}
.etapa-pct{font-family:'Bebas Neue',sans-serif;font-size:15px;color:rgba(253,253,253,0.35);}
.etapa-pct.active{color:var(--laranja);}
.prog-bar-row{width:100%;max-width:1060px;margin-top:12px;}
.prog-bar-track{width:100%;height:4px;background:rgba(253,253,253,0.08);border-radius:2px;overflow:hidden;}
.prog-bar-fill{height:100%;background:var(--laranja);border-radius:2px;width:0;box-shadow:0 0 10px rgba(225,124,76,0.5);}
.slide.is-active .prog-bar-fill{animation:fillBar 1s 0.9s ease forwards;}
${progressFill}
.check-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;width:100%;max-width:900px;margin-top:16px;}
.check-card{display:flex;align-items:center;gap:14px;padding:13px 18px;background:rgba(253,253,253,0.04);border:1px solid rgba(253,253,253,0.07);border-left:3px solid var(--laranja);transition:all 0.22s ease;}
.check-card:hover{background:rgba(225,124,76,0.07);transform:translateX(4px);}
.chk{width:20px;height:20px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:900;color:#fff;}
.check-lbl{font-size:13px;color:rgba(253,253,253,0.78);font-weight:300;line-height:1.4;}
.week-list{display:flex;flex-direction:column;gap:12px;width:100%;max-width:760px;margin-top:16px;}
.week-card{display:flex;align-items:center;gap:18px;padding:18px 24px;border:1px solid rgba(253,253,253,0.1);background:rgba(253,253,253,0.04);position:relative;overflow:hidden;transition:all 0.25s ease;}
.week-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:rgba(253,253,253,0.2);}
.week-card:hover{transform:translateX(5px);}
.week-n{font-family:'Bebas Neue',sans-serif;font-size:22px;color:rgba(253,253,253,0.2);width:28px;flex-shrink:0;text-align:center;}
.week-ico{width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(253,253,253,0.18);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.week-txt{font-size:15px;color:var(--off-white);}
.ring-wrap{position:relative;width:120px;height:120px;margin:0 auto 24px;}
.ring-svg{transform:rotate(-90deg);}
.ring-track{fill:none;stroke:rgba(253,253,253,0.07);stroke-width:4;}
.ring-fill{fill:none;stroke:var(--laranja);stroke-width:4;stroke-linecap:round;stroke-dasharray:314;stroke-dashoffset:314;filter:drop-shadow(0 0 6px rgba(225,124,76,0.6));}
.slide.is-active .ring-fill{animation:fillRing 1.2s 0.6s ease forwards;}
${ringFill}
.ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ring-pct{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--laranja);line-height:1;}
.ring-lbl{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(253,253,253,0.4);font-weight:700;margin-top:2px;}
.cta-eyebrow{display:flex;align-items:center;justify-content:center;gap:10px;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:var(--laranja);font-weight:700;margin-bottom:16px;}
.cta-eyebrow::before,.cta-eyebrow::after{content:'';display:block;width:22px;height:2px;background:var(--laranja);}
.cta-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(42px,7vw,84px);letter-spacing:4px;line-height:0.92;margin-bottom:16px;}
.cta-title .accent{color:var(--laranja);}
.cta-sub{font-size:clamp(13px,1.3vw,15px);color:rgba(253,253,253,0.5);max-width:400px;line-height:1.75;font-weight:300;margin:0 auto 24px;}
.next-items{display:flex;flex-direction:column;gap:8px;}
.next-item{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(253,253,253,0.6);}
.next-dot{width:6px;height:6px;border-radius:50%;background:var(--laranja);flex-shrink:0;animation:pulseDot 2s ease-in-out infinite;}
@keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(225,124,76,0.4)}50%{box-shadow:0 0 0 6px rgba(225,124,76,0)}}
@media(max-width:768px){.slide{padding:72px 6vw 80px;}#hud{padding:14px 20px;}#key-hint{display:none;}.geral-grid{grid-template-columns:1fr;}.check-grid{grid-template-columns:1fr;}.hero-visual{display:none;}}
</style>
</head>
<body>
<div id="hud">
  <img src="data:image/svg+xml;base64,${LOGO_B64}" alt="Lavoura" style="height:28px;width:auto;">
  <div class="hud-right">
    <div class="hud-badge">REUNIÃO QUINZENAL</div>
    <div class="hud-counter" id="hud-counter">1 / 6</div>
  </div>
</div>
<div id="prog-bar"></div>
<div id="deck">

  <div class="slide is-active" id="slide-1">
    <div class="grain"></div>
    <div class="hero-bg-grad"></div>
    <div class="deco-circle" style="width:460px;height:460px;right:-140px;top:50%;transform:translateY(-54%);animation:rotateSlow 45s linear infinite;"></div>
    <div class="deco-circle" style="width:220px;height:220px;right:60px;top:18%;animation:rotateSlow 28s linear infinite reverse;"></div>
    <div class="hero-wrap">
      <div class="hero-content">
        <div class="hero-eyebrow el d0">Reunião Quinzenal de Progresso</div>
        <h1 class="hero-title el d1">UNIDADE ${d.unidadeNumero}${d.unidadeNome ? '<br><span class="accent">' + d.unidadeNome.toUpperCase() + '</span>' : ''}</h1>
        <div class="hero-divider"></div>
        <div class="hero-meta el d2">
          <div class="hero-meta-item"><span class="hero-meta-label">Data</span><span class="hero-meta-value">${dataFmt}</span></div>
          <div class="hero-meta-item"><span class="hero-meta-label">Etapa Atual</span><span class="hero-meta-value">${ETAPA_EMOJIS[d.etapaAtualNumero]} ${d.etapaAtualNome.toUpperCase()}</span></div>
          <div class="hero-meta-item"><span class="hero-meta-label">Progresso</span><span class="hero-meta-value" style="color:var(--laranja)">${d.pctGeral}%</span></div>
        </div>
      </div>
      <div class="hero-visual"><div class="hero-big-num">0${d.etapaAtualNumero}</div></div>
    </div>
  </div>

  <div class="slide" id="slide-2">
    <div class="deco-circle" style="width:400px;height:400px;right:-160px;bottom:-160px;opacity:0.3;"></div>
    <div class="eyebrow el d0">Onde estamos</div>
    <h2 class="stitle el d1">VISÃO GERAL<br>DA JORNADA</h2>
    <div class="geral-grid">
      <div class="kpi-card el d2"><div class="kpi-label">Progresso Total</div><div class="kpi-value">${d.pctGeral}%</div><div class="kpi-sub">${d.totalConcluidos} de ${d.totalSubitens} itens</div></div>
      <div class="kpi-card el d3"><div class="kpi-label">Etapa Atual</div><div class="kpi-value" style="font-size:clamp(16px,2.2vw,26px);line-height:1.2">${ETAPA_EMOJIS[d.etapaAtualNumero]} ${d.etapaAtualNome.toUpperCase()}</div><div class="kpi-sub">${d.etapas.find(e=>e.numero===d.etapaAtualNumero)?.concluidos ?? 0} de ${d.etapas.find(e=>e.numero===d.etapaAtualNumero)?.total ?? 0} itens</div></div>
      <div class="kpi-card el d4"><div class="kpi-label">Próxima Etapa</div><div class="kpi-value" style="font-size:clamp(16px,2.2vw,26px);line-height:1.2">${d.proximaEtapaNome ? ETAPA_EMOJIS[d.etapaAtualNumero+1] + ' ' + d.proximaEtapaNome.toUpperCase() : '🎉 CONCLUÍDO'}</div></div>
    </div>
    <div class="etapas-list el d5">${etapasList}</div>
    <div class="prog-bar-row el d6"><div class="prog-bar-track"><div class="prog-bar-fill"></div></div></div>
  </div>

  <div class="slide" id="slide-3">
    <div class="eyebrow el d0">Últimos 15 dias</div>
    <span class="tag tag-done el d1">✓ Concluído</span>
    <h2 class="stitle el d2">O QUE FOI<br>FEITO</h2>
    ${d.feito.length > 0 ? '<div class="check-grid">' + feitoCards + '</div>' : '<p style="color:rgba(253,253,253,0.4);font-size:15px;margin-top:16px;">Nenhum item concluído nos últimos 15 dias.</p>'}
  </div>

  <div class="slide" id="slide-4">
    <div class="deco-circle" style="width:400px;height:400px;right:-120px;bottom:-100px;opacity:0.35;animation:rotateSlow 50s linear infinite;"></div>
    <div class="eyebrow el d0">Esta semana</div>
    <span class="tag tag-current el d1">↗ Em andamento</span>
    <h2 class="stitle el d2">O QUE PRECISA<br>SER FEITO</h2>
    ${d.semana.length > 0 ? '<div class="week-list">' + semanaCards + '</div>' : '<p style="color:rgba(253,253,253,0.4);font-size:15px;margin-top:16px;">Todos os itens desta etapa foram concluídos! 🎉</p>'}
  </div>

  <div class="slide" id="slide-5">
    <div class="deco-circle" style="width:500px;height:500px;right:-200px;top:-150px;opacity:0.3;animation:rotateSlow 60s linear infinite;"></div>
    <div class="eyebrow el d0">No horizonte</div>
    <span class="tag tag-next el d1">→ Próximo</span>
    <h2 class="stitle el d2">PRÓXIMA<br>SEMANA</h2>
    ${d.proximaSemana.length > 0 ? '<div class="week-list">' + proximaCards + '</div>' : '<p style="color:rgba(253,253,253,0.4);font-size:15px;margin-top:16px;">Em breve: ' + (d.proximaEtapaNome ? ETAPA_EMOJIS[d.etapaAtualNumero+1] + ' ' + d.proximaEtapaNome : 'colheita!') + '</p>'}
  </div>

  <div class="slide" id="slide-6">
    <div class="grain"></div>
    <div class="deco-circle" style="width:480px;height:480px;left:-200px;top:50%;transform:translateY(-50%);opacity:0.25;animation:rotateSlow 55s linear infinite;"></div>
    <div class="cta-eyebrow el d0">Reunião Quinzenal — Unidade ${d.unidadeNumero}</div>
    <div class="ring-wrap el d1">
      <svg class="ring-svg" width="120" height="120" viewBox="0 0 120 120">
        <circle class="ring-track" cx="60" cy="60" r="50"/>
        <circle class="ring-fill" cx="60" cy="60" r="50"/>
      </svg>
      <div class="ring-inner"><span class="ring-pct">${d.pctGeral}%</span><span class="ring-lbl">Progresso</span></div>
    </div>
    <h2 class="cta-title el d2">${ctaL1}<br><span class="accent">${ctaL2}</span></h2>
    <p class="cta-sub el d3">Cada etapa concluída é uma semente que germina.<br>Continuamos juntos até a colheita.</p>
    <div class="next-items el d4">${nextItems}</div>
    <img src="data:image/svg+xml;base64,${LOGO_B64}" alt="Lavoura" class="el d5" style="height:34px;width:auto;margin-top:24px;opacity:0.55;">
  </div>

</div>
<div id="nav-controls">
  <button class="nav-btn" id="btn-prev" disabled>&#8592;</button>
  <div class="nav-dots" id="nav-dots"></div>
  <button class="nav-btn" id="btn-next">&#8594;</button>
</div>
<div id="key-hint">← → para navegar</div>
<script>
const TOTAL=6;let current=0,animating=false;
const allSlides=Array.from(document.querySelectorAll('.slide'));
const dotsWrap=document.getElementById('nav-dots');
const btnPrev=document.getElementById('btn-prev');
const btnNext=document.getElementById('btn-next');
const counter=document.getElementById('hud-counter');
const progBar=document.getElementById('prog-bar');
for(let i=0;i<TOTAL;i++){const d=document.createElement('div');d.className='dot'+(i===0?' active':'');d.addEventListener('click',()=>goTo(i));dotsWrap.appendChild(d);}
function goTo(idx){if(idx===current||animating||idx<0||idx>=TOTAL)return;animating=true;const from=allSlides[current],to=allSlides[idx];const dir=idx>current?1:-1;from.classList.remove('is-active');from.classList.add('is-leaving');to.style.transition='none';to.style.transform=\`translateX(\${dir*100}%)\`;to.style.visibility='visible';to.style.opacity='1';to.getBoundingClientRect();to.style.transition='transform 0.65s cubic-bezier(0.77,0,0.18,1),opacity 0.65s ease';to.style.transform='translateX(0)';to.classList.add('is-active');current=idx;updateUI();setTimeout(()=>{from.classList.remove('is-leaving');from.style.cssText='';to.style.transition='';to.style.transform='';to.style.opacity='';animating=false;},700);}
function updateUI(){counter.textContent=\`\${current+1} / \${TOTAL}\`;progBar.style.width=\`\${((current+1)/TOTAL)*100}%\`;btnPrev.disabled=current===0;btnNext.disabled=current===TOTAL-1;document.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('active',i===current));}
btnPrev.addEventListener('click',()=>goTo(current-1));
btnNext.addEventListener('click',()=>goTo(current+1));
document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();goTo(current+1);}if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();goTo(current-1);}if(e.key==='Home')goTo(0);if(e.key==='End')goTo(TOTAL-1);});
let txStart=0;
document.addEventListener('touchstart',e=>{txStart=e.changedTouches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-txStart;if(Math.abs(dx)>44)goTo(dx<0?current+1:current-1);},{passive:true});
let wLock=false;
document.addEventListener('wheel',e=>{if(wLock)return;wLock=true;if(e.deltaY>20)goTo(current+1);else if(e.deltaY<-20)goTo(current-1);setTimeout(()=>{wLock=false;},900);},{passive:true});
updateUI();
</script>
</body>
</html>`;
}
