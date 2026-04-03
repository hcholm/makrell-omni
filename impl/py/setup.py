from setuptools import setup, find_packages

setup(
    name='makrell',
    version='0.9.1',
    author='Hans-Christian Holm',
    author_email='jobb@hcholm.net',
    description='Makrell: A programming language family',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    url='https://makrell.dev/',
    project_urls={
        'Documentation': 'https://makrell.dev/',
        'Repository': 'https://github.com/hcholm/makrell-omni',
        'Issues': 'https://github.com/hcholm/makrell-omni/issues',
    },
    license='MIT',
    packages=find_packages(exclude=["tests*"]),
    package_data={
        "makrell": ["*.mr", "*.mrpy"],
        "makrell.makrellpy": ["*.mr", "*.mrpy"],
    },
    entry_points={
        'console_scripts': [
            'makrell=makrell.cli:main',
            'makrell-langserver=makrell.langserver:main',
        ],
    },
    install_requires=[
        'regex',
        'lsprotocol',
        'pygls<2',
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.10',
)
